import { usePeer as useCorePeer, type PeerManagerLike } from "p2play-core";
import type { GameState } from "../core/types";
import { soundManager } from "../core/soundFX";

interface UsePeerOptions {
  externalPeerManager?: PeerManagerLike<GameState>;
}

export function usePeer(options?: UsePeerOptions) {
  return useCorePeer<GameState>({
    externalPeerManager: options?.externalPeerManager,
    namespacePrefix: "royal",
    sounds: {
      coin: () => soundManager.playCoin(),
      card: () => soundManager.playCard(),
      victory: () => soundManager.playVictory(),
      defeat: () => soundManager.playDefeat(),
      sword: () => soundManager.playSword(),
      click: () => soundManager.playClick(),
      ping: () => soundManager.playPing(),
    },
  });
}
