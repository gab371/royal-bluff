import { useEffect, useRef, useState, useCallback } from "react";
import {
  attachPresenceHandlers,
  createSeatEngine,
  handleJoinGameSeat,
} from "p2play-core/presence";
import { usePeer } from "./usePeer";
import { RoyalBluffEngine } from "../core/gameEngine";
import { sanitizeGameState, sanitizeGameStateForSpectator } from "../network/protocol";
import type { NetworkMessage } from "../network/protocol";
import type { GameState, ActionType, Character, GameConfig } from "../core/types";
import { logMessage } from "../core/challengeEngine";
import { installTestHooks, registerEngineGetter } from "../testHooks";

interface UseGameOptions {
  externalPeerManager?: import("p2play-core").PeerManagerLike;
  playerName?: string;
  playerAvatar?: string;
  isEmbedded?: boolean;
  isHost?: boolean;
  lateJoin?: boolean;
  gameConfig?: any;
  hubPhase?: string;
}

export function useGame(options?: UseGameOptions) {
  const p2p = usePeer(options);
  const {
    isHost,
    myPeerId,
    peerManager,
    playSfx,
    hostGame,
    joinGame,
    sendAction,
    sendChat,
    gameState,
    status,
    error,
    chatMessages,
    disconnect
  } = p2p;

  const gameEngineRef = useRef<RoyalBluffEngine | null>(null);
  const victoryPlayedRef = useRef<boolean>(false);

  // Expose test hooks (dev/test builds only) for E2E determinism.
  // No-op in production (installTestHooks gates on import.meta.env.PROD).
  useEffect(() => {
    registerEngineGetter(() => gameEngineRef.current);
    installTestHooks();
  }, []);

  const [localPlayerName, setLocalPlayerName] = useState<string>(options?.playerName || "");
  const [localPlayerAvatar, setLocalPlayerAvatar] = useState<string>(options?.playerAvatar || "👑");

  // Helper function to broadcast sanitized states to each player
  const broadcastSanitizedStates = useCallback((engineState: GameState, overridePeerId?: string) => {
    const activePeerId = overridePeerId || myPeerId;
    if (!activePeerId) return;
    for (const p of engineState.players) {
      peerManager.registerPeerProfile?.(p.id, { username: p.name, avatar: p.avatar });
    }
    for (const s of engineState.spectators) {
      peerManager.registerPeerProfile?.(s.id, { username: s.name, avatar: s.avatar });
    }

    const sent = new Set<string>([activePeerId]);

    const resolveConn = (id: string) => {
      let conn = peerManager.connections.get(id);
      if (!conn) {
        for (const [peerId, connection] of peerManager.connections.entries()) {
          if (peerId.endsWith(id) || id.endsWith(peerId)) {
            conn = connection;
            break;
          }
        }
      }
      return conn;
    };

    // Send state to local host state
    const hostSanitized = sanitizeGameState(engineState, activePeerId);
    p2p.peerManager.onStateReceived?.(JSON.parse(JSON.stringify(hostSanitized)));

    // Send customized sanitized state to each connected player
    engineState.players.forEach((p) => {
      if (p.id === activePeerId) return;
      const conn = resolveConn(p.id);
      if (conn && conn.open) {
        const clientSanitized = sanitizeGameState(engineState, p.id);
        conn.send({ type: 'STATE_UPDATE', state: clientSanitized });
        sent.add(p.id);
      }
    });

    // Spectators receive a fully public (no private info) view of the state.
    const spectatorView = sanitizeGameStateForSpectator(engineState);
    engineState.spectators.forEach((s) => {
      const conn = resolveConn(s.id);
      if (conn && conn.open) {
        conn.send({ type: 'STATE_UPDATE', state: JSON.parse(JSON.stringify(spectatorView)) });
        sent.add(s.id);
      }
    });

    // Hub late-join: push a public view to any open peer not yet in the engine
    // so they are not stuck on an empty lobby before JOIN_GAME lands.
    peerManager.connections.forEach((conn, peerId) => {
      if (!conn.open || sent.has(peerId)) return;
      const alreadyKnown =
        engineState.players.some((p) => p.id === peerId || peerId.endsWith(p.id) || p.id.endsWith(peerId)) ||
        engineState.spectators.some((s) => s.id === peerId || peerId.endsWith(s.id) || s.id.endsWith(peerId));
      if (alreadyKnown) return;
      conn.send({ type: 'STATE_UPDATE', state: JSON.parse(JSON.stringify(spectatorView)) });
    });
  }, [myPeerId, peerManager, p2p.peerManager]);

  // Host Action Handler & Embedded Auto-Start
  useEffect(() => {
    if (!isHost) {
      gameEngineRef.current = null;
      return;
    }

    if (!gameEngineRef.current) {
      gameEngineRef.current = new RoyalBluffEngine();
    }

    const engine = gameEngineRef.current;

    // Embedded mode: populate players from the Hub lobby but STAY in LOBBY
    // so the host can configure the deck / action helper before launching.
    if (options?.isEmbedded && options?.externalPeerManager && engine.state.phase === 'LOBBY') {
      setTimeout(() => {
        engine.state.players = [];
        const hostName = options.playerName || "Hôte";
        const hostAvatar = options.playerAvatar || "👑";
        engine.addPlayer(myPeerId!, hostName, hostAvatar, true);

        if ((peerManager as any).lobbyPlayers) {
          (peerManager as any).lobbyPlayers.forEach((p: any) => {
            if (p.peerId && p.peerId !== myPeerId) {
              engine.addPlayer(p.peerId, p.username || `Joueur ${p.peerId.slice(0, 4)}`, p.avatar || "👤", false);
            }
          });
        }

        // Do NOT auto-start: the host triggers startGame from the lobby.
        broadcastSanitizedStates(engine.state);
      }, 0);
    }

    const getSeatEngine = () =>
      createSeatEngine({
        getPhase: () => engine.state.phase,
        getPlayers: () => engine.state.players,
        getSpectators: () => engine.state.spectators,
        markDisconnected: (id) => engine.markDisconnected(id),
        isDisconnected: (id) => engine.isDisconnected(id),
        remapPlayerId: (o, n, p) => engine.remapPlayerId(o, n, p),
        removePlayer: (id) => engine.removePlayer(id),
      });

    const presence = attachPresenceHandlers({
      peerManager,
      getEngine: getSeatEngine,
      onBroadcast: () => broadcastSanitizedStates(engine.state),
      onHostAction: (senderPeerId, actionMsg) => {
        const msg = actionMsg as NetworkMessage;
        if (msg.type !== "ACTION") return;
        // Never trust client-supplied playerId — identity is the DataConnection peer.
        const { actionName, payload } = msg;
        const playerId = senderPeerId;

        switch (actionName) {
          case "JOIN_GAME": {
            handleJoinGameSeat({
              engine: getSeatEngine(),
              playerId,
              payload: { name: payload?.name, avatar: payload?.avatar },
              trustedName: peerManager.getTrustedUsername?.(playerId),
              isHostPlayer: playerId === myPeerId,
              addPlayer: (id, name, avatar, isHost) =>
                engine.addPlayer(id, name, avatar, isHost),
              addSpectator: (id, name, avatar) =>
                engine.addSpectator(id, name, avatar),
            });
            break;
          }

          case "TOGGLE_READY":
            engine.setPlayerReady(playerId, payload.readyStatus);
            const p = engine.state.players.find((pl) => pl.id === playerId);
            if (p) {
              logMessage(
                engine.state,
                `${p.name} est ${payload.readyStatus ? "prêt !" : "en attente..."}`,
                "info",
              );
            }
            break;

          case "START_GAME":
            if (playerId === myPeerId) {
              engine.startGame();
              playSfx("sword");
            }
            break;

          case "CHANGE_CONFIG":
            if (playerId === myPeerId) {
              engine.setConfig(payload.config);
            }
            break;

          case "SET_ROLE": {
            const requesterIsHost = playerId === myPeerId;
            const targetId = payload.peerId as string;
            const nextRole = payload.role as "player" | "spectator";
            // Host may change anyone; guests may only change themselves.
            if (requesterIsHost || targetId === playerId) {
              engine.setPlayerRole(targetId, nextRole, {
                requesterPeerId: playerId,
                requesterIsHost,
              });
            }
            break;
          }

          case "LOCK_SPECTATOR":
            // Host-only. Lock = force spectator + prevent self-promote to player.
            if (playerId === myPeerId) {
              const targetId = payload.peerId as string;
              const locked = !!payload.locked;
              if (locked) {
                engine.setPlayerRole(targetId, "spectator", {
                  requesterPeerId: playerId,
                  requesterIsHost: true,
                });
              }
              engine.setSpectatorLock(targetId, locked);
            }
            break;

          case "DECLARE_ACTION":
            engine.executeAction(playerId, payload.action, payload.targetUid);
            // Sound depends on the declared action type.
            switch (payload.action as ActionType) {
              case "ASSASSINAT":
              case "COUP":
                playSfx("sword");
                break;
              case "REVENU":
              case "AIDE_EXTERIEURE":
              case "TAXE":
              case "VOL":
                playSfx("coin");
                break;
              case "ECHANGE":
              case "INQUISITION":
                playSfx("card");
                break;
            }
            break;

          case "CHALLENGE_DECISION":
            engine.submitChallengeDecision(playerId, payload.challenge);
            if (payload.challenge) playSfx("click");
            break;

          case "BLOCK_DECISION":
            engine.submitBlockDecision(playerId, payload.blockCharacter);
            if (payload.blockCharacter) playSfx("click");
            break;

          case "BLOCK_CHALLENGE_DECISION":
            engine.submitBlockChallengeDecision(playerId, payload.challenge);
            if (payload.challenge) playSfx("click");
            break;

          case "CHOOSE_LOSS":
            engine.chooseLoss(playerId, payload.cardId);
            playSfx("defeat");
            break;

          case "EXCHANGE_SELECT":
            engine.exchangeSelect(playerId, payload.keptCardIds);
            break;

          case "INQUISITION_DECIDE":
            engine.inquisitionDecide(playerId, payload.forceSwap);
            break;

          case "RESET_LOBBY":
            if (playerId === myPeerId) {
              engine.resetToLobby();
            }
            break;
        }

        broadcastSanitizedStates(engine.state);

        // Victory fanfare once when the game ends (broadcast to all peers).
        if (engine.state.phase === "GAME_OVER" && !victoryPlayedRef.current) {
          victoryPlayedRef.current = true;
          playSfx("victory");
        } else if (engine.state.phase !== "GAME_OVER") {
          victoryPlayedRef.current = false;
        }
      },
    });

    return () => {
      presence.dispose();
    };
  }, [isHost, myPeerId, peerManager, playSfx, broadcastSanitizedStates]);

  // Embedded guests must announce themselves — host populates from lobbyPlayers
  // only once at mount; late joiners (and race survivors) need JOIN_GAME.
  useEffect(() => {
    if (!options?.isEmbedded || isHost || !myPeerId) return;
    const name = options.playerName || localPlayerName || "Joueur";
    const avatar = options.playerAvatar || localPlayerAvatar || "👤";
    const sendJoin = () => {
      peerManager.sendToHost("ACTION", {
        actionName: "JOIN_GAME",
        playerId: myPeerId,
        payload: { name, avatar },
      });
    };
    // Retry: hub DataConnection / hostActionHandler may not be ready on first tick.
    const t1 = window.setTimeout(sendJoin, 250);
    const t2 = window.setTimeout(sendJoin, 1000);
    const t3 = window.setTimeout(sendJoin, 2500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [
    options?.isEmbedded,
    options?.playerName,
    options?.playerAvatar,
    isHost,
    myPeerId,
    localPlayerName,
    localPlayerAvatar,
    peerManager,
  ]);

  // Client triggers
  const hostRoom = useCallback(async (name: string, avatar: string) => {
    setLocalPlayerName(name);
    setLocalPlayerAvatar(avatar);
    const roomId = await hostGame(undefined, { username: name, avatar });
    const engine = new RoyalBluffEngine();
    gameEngineRef.current = engine;
    engine.addPlayer(roomId, name, avatar, true);
    broadcastSanitizedStates(engine.state, roomId);
  }, [hostGame, broadcastSanitizedStates]);

  const joinRoom = useCallback(async (name: string, avatar: string, roomId: string) => {
    setLocalPlayerName(name);
    setLocalPlayerAvatar(avatar);
    const { peerId } = await joinGame(roomId, { username: name, avatar });
    setTimeout(() => {
      peerManager.sendToHost('ACTION', {
        actionName: 'JOIN_GAME',
        playerId: peerId,
        payload: { name, avatar },
      });
    }, 1000);
  }, [joinGame, peerManager]);

  const toggleReady = useCallback((readyStatus: boolean) => {
    sendAction('TOGGLE_READY', { readyStatus });
  }, [sendAction]);

  const startGame = useCallback(() => {
    sendAction('START_GAME', {});
  }, [sendAction]);

  const declareAction = useCallback((action: ActionType, targetUid?: string) => {
    sendAction('DECLARE_ACTION', { action, targetUid });
  }, [sendAction]);

  const challengeDecision = useCallback((challenge: boolean) => {
    sendAction('CHALLENGE_DECISION', { challenge });
  }, [sendAction]);

  const blockDecision = useCallback((blockCharacter: Character | null) => {
    sendAction('BLOCK_DECISION', { blockCharacter });
  }, [sendAction]);

  const blockChallengeDecision = useCallback((challenge: boolean) => {
    sendAction('BLOCK_CHALLENGE_DECISION', { challenge });
  }, [sendAction]);

  const chooseLoss = useCallback((cardId: string) => {
    sendAction('CHOOSE_LOSS', { cardId });
  }, [sendAction]);

  const exchangeSelect = useCallback((keptCardIds: string[]) => {
    sendAction('EXCHANGE_SELECT', { keptCardIds });
  }, [sendAction]);

  const inquisitionDecide = useCallback((forceSwap: boolean) => {
    sendAction('INQUISITION_DECIDE', { forceSwap });
  }, [sendAction]);

  const changeConfig = useCallback((config: Partial<GameConfig>) => {
    sendAction('CHANGE_CONFIG', { config });
  }, [sendAction]);

  const setRole = useCallback((peerId: string, role: 'player' | 'spectator') => {
    sendAction('SET_ROLE', { peerId, role });
  }, [sendAction]);

  const lockSpectator = useCallback((peerId: string, locked: boolean) => {
    sendAction('LOCK_SPECTATOR', { peerId, locked });
  }, [sendAction]);

  const resetLobby = useCallback(() => {
    sendAction('RESET_LOBBY', {});
  }, [sendAction]);

  const sendChatMessage = useCallback((text: string) => {
    sendChat(localPlayerName || "Monarque", text);
  }, [sendChat, localPlayerName]);

  return {
    isHost,
    myPeerId,
    hostPeerId: p2p.hostPeerId,
    connectedPeers: p2p.connectedPeers,
    chatMessages,
    gameState,
    status,
    error,
    hostRoom,
    joinRoom,
    toggleReady,
    startGame,
    declareAction,
    challengeDecision,
    blockDecision,
    blockChallengeDecision,
    chooseLoss,
    exchangeSelect,
    inquisitionDecide,
    changeConfig,
    setRole,
    lockSpectator,
    resetLobby,
    sendChatMessage,
    disconnect,
    localPlayerName,
    localPlayerAvatar,
  };
}
