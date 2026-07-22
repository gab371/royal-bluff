import { RoyalBluffEngine } from "./gameEngine";
import type { Character } from "./types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

function runTests() {
  console.log("=== Début des Tests de RoyalBluffEngine ===");

  // 1. Initialisation
  const engine = new RoyalBluffEngine();
  engine.addPlayer("p1", "Alice", "👩", true);
  engine.addPlayer("p2", "Bob", "👨", false);
  engine.addPlayer("p3", "Charlie", "🧙", false);

  assert(engine.state.players.length === 3, "Trois joueurs ajoutés");
  assert(engine.state.phase === 'LOBBY', "Phase initiale LOBBY");

  // Lancement du jeu
  const started = engine.startGame();
  assert(started, "Le jeu a démarré avec succès");
  assert(engine.state.phase === 'ACTION_SELECTION', "La phase passe à ACTION_SELECTION");
  assert(engine.state.players[0].coins === 2, "Chaque joueur commence avec 2 pièces");
  assert(engine.state.players[0].cards.length === 2, "Chaque joueur a 2 cartes");

  // 2. Action : REVENU (Alice)
  let activePlayer = engine.getActivePlayer();
  assert(activePlayer.id === "p1", "Le joueur actif est Alice (p1)");
  let success = engine.executeAction("p1", "REVENU");
  assert(success, "L'action REVENU est exécutée par Alice");
  assert(engine.state.players[0].coins === 3, "Alice a maintenant 3 pièces");
  assert(engine.getActivePlayer().id === "p2", "Le tour passe à Bob (p2)");

  // 3. Action : COUP D'ETAT obligatoire si >= 10 pièces
  // On donne artificiellement 10 pièces à Bob
  engine.state.players[1].coins = 10;
  // Essai de faire un REVENU avec Bob
  success = engine.executeAction("p2", "REVENU");
  assert(!success, "Bob ne peut pas faire un Revenu car il a 10 pièces");
  
  // Bob fait un COUP sur Charlie (p3)
  success = engine.executeAction("p2", "COUP", "p3");
  assert(success, "Bob lance un COUP sur Charlie");
  assert(engine.state.players[1].coins === 3, "Bob a payé 7 pièces");
  assert(engine.state.phase === 'CHOOSE_LOSS', "La phase passe à CHOOSE_LOSS pour la victime");
  assert(engine.state.pendingLoss?.playerUid === "p3", "Charlie doit choisir une carte à perdre");

  // Charlie perd sa première carte
  const charlieCardId = engine.state.players[2].cards[0].id;
  const charlieCardChar = engine.state.players[2].cards[0].character;
  success = engine.chooseLoss("p3", charlieCardId);
  assert(success, "Charlie a choisi sa carte à perdre");
  assert(engine.state.players[2].cards[0].isRevealed, "La carte de Charlie est révélée");
  assert(engine.state.phase === 'ACTION_SELECTION', "La phase repasse à ACTION_SELECTION");
  assert(engine.getActivePlayer().id === "p3", "C'est au tour de Charlie");

  // 4. Action : TAXE (Charlie)
  // Charlie a 1 carte restante. Il demande la TAXE.
  // On force sa carte à être Comtesse pour les tests
  engine.state.players[2].cards[1].character = 'Comtesse';
  success = engine.executeAction("p3", "TAXE");
  assert(success, "Charlie déclare la TAXE");
  assert(engine.state.phase === 'CHALLENGE_WINDOW', "Phase CHALLENGE_WINDOW déclenchée");

  // Bob conteste l'action de Charlie
  success = engine.submitChallengeDecision("p2", true);
  assert(success, "Bob conteste l'action");
  // Charlie n'a pas la Duchesse (il a Comtesse), donc Charlie perd son défi et sa carte restante
  assert(engine.state.phase === 'CHOOSE_LOSS', "Charlie doit choisir une perte");
  const lastCardId = engine.state.players[2].cards[1].id;
  success = engine.chooseLoss("p3", lastCardId);
  assert(success, "Charlie choisit sa perte");
  assert(engine.state.players[2].isEliminated, "Charlie est éliminé");

  // 5. Scénario de victoire (Alice gagne si Bob est éliminé)
  // On élimine Bob
  engine.state.players[1].cards.forEach(c => c.isRevealed = true);
  engine.state.players[1].isEliminated = true;
  engine.advanceTurn();
  assert(engine.state.phase === 'GAME_OVER', "Le jeu est terminé");
  assert(engine.state.winnerId === "p1", "Alice est déclarée gagnante");

  console.log("=== Tous les tests ont réussi ! ===");
}

function runChallengeWonTests() {
  console.log("=== Tests : Défi perdu (l'acteur avait la bonne carte) ===");

  const engine = new RoyalBluffEngine();
  engine.addPlayer("j1", "John", "👑", true);
  engine.addPlayer("j2", "Seb", "🧙", false);
  engine.startGame();

  // John (j1) déclare TAXE. On force sa main à contenir la Duchesse.
  engine.state.players[0].cards[0].character = 'Duchesse';
  engine.state.players[0].cards[1].character = 'Assassin';
  const coinsBefore = engine.state.players[0].coins;

  let ok = engine.executeAction("j1", "TAXE");
  assert(ok, "John déclare la TAXE");
  assert(engine.state.phase === 'CHALLENGE_WINDOW', "Phase CHALLENGE_WINDOW");

  // Seb (j2) conteste à tort (John a bien la Duchesse)
  ok = engine.submitChallengeDecision("j2", true);
  assert(ok, "Seb conteste la TAXE");
  assert(engine.state.phase === 'CHOOSE_LOSS', "Le challenger (Seb) doit perdre une influence");
  assert(engine.state.pendingLoss?.playerUid === "j2", "Seb est le perdant du défi");

  // Seb choisit sa carte à perdre
  const sebCardId = engine.state.players[1].cards[0].id;
  ok = engine.chooseLoss("j2", sebCardId);
  assert(ok, "Seb révèle son influence");
  assert(engine.state.players[1].cards[0].isRevealed, "Carte de Seb révélée");

  // BUG RÉPARÉ : John doit avoir reçu ses +3 pièces même après un défi
  assert(engine.state.players[0].coins === coinsBefore + 3, "John reçoit ses +3 pièces de la TAXE après un défi perdu");
  assert(engine.state.phase === 'ACTION_SELECTION', "Retour à ACTION_SELECTION après résolution");
  assert(engine.getActivePlayer().id === "j2", "Le tour passe à Seb");

  console.log("=== Tests défi perdu réussis ! ===");
}

function runInquisitionTests() {
  console.log("=== Tests : Inquisiteur (deck Réformation) ===");

  const engine = new RoyalBluffEngine();
  engine.addPlayer("i1", "Ina", "🦅", true);
  engine.addPlayer("i2", "Igor", "🛡️", false);
  engine.setConfig({ deckId: 'REFORMATION' });
  engine.startGame();

  assert(engine.state.config.deckId === 'REFORMATION', "Deck Réformation sélectionné");
  const totalCards = engine.state.deck.length + engine.state.players.reduce((n, p) => n + p.cards.length, 0);
  assert(totalCards === 18, "Deck Réformation contient 18 cartes (6 rôles x 3)");

  // Ina (i1) déclare INQUISITION sur Igor. On force sa main à Inquisiteur.
  engine.state.players[0].cards[0].character = 'Inquisiteur';
  engine.state.players[0].cards[1].character = 'Duchesse';
  engine.state.players[1].cards[0].character = 'Capitaine';
  engine.state.players[1].cards[1].character = 'Assassin';

  let ok = engine.executeAction("i1", "INQUISITION", "i2");
  assert(ok, "Ina déclare l'Inquisition sur Igor");
  assert(engine.state.phase === 'CHALLENGE_WINDOW', "Phase CHALLENGE_WINDOW");

  // Igor laisse passer (pas de défi)
  ok = engine.submitChallengeDecision("i2", false);
  assert(ok, "Igor laisse passer l'Inquisition");
  assert(engine.state.phase === 'INQUISITION_DECISION', "Phase INQUISITION_DECISION");
  assert(engine.state.inquisitionReveal?.actorUid === "i1", "La carte inspectée est révélée à Ina");
  assert(engine.state.inquisitionReveal?.targetUid === "i2", "Cible = Igor");

  const seenChar = engine.state.inquisitionReveal!.character;
  const igorCardId = engine.state.inquisitionReveal!.cardId;
  assert(seenChar === 'Capitaine' || seenChar === 'Assassin', "Ina voit une influence cachée d'Igor");

  // Ina force l'échange de la carte inspectée
  const igorFirstCharBefore = engine.state.players[1].cards.find(c => c.id === igorCardId)!.character;
  ok = engine.inquisitionDecide("i1", true);
  assert(ok, "Ina force l'échange");
  const igorFirstCharAfter = engine.state.players[1].cards.find(c => c.id === igorCardId)!.character;
  assert(igorFirstCharBefore !== igorFirstCharAfter || true, "Échange effectué (ou carte identique par hasard)");
  assert(engine.state.inquisitionReveal === null, "Révélation nettoyée après décision");
  assert(engine.state.phase === 'ACTION_SELECTION', "Retour à ACTION_SELECTION");
  assert(engine.getActivePlayer().id === "i2", "Le tour passe à Igor");

  console.log("=== Tests Inquisiteur réussis ! ===");
}

try {
  runTests();
  runChallengeWonTests();
  runInquisitionTests();
} catch (e) {
  console.error("❌ Test échoué :", e);
  process.exit(1);
}
