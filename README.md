# 👑 Royal Bluff (Coup) - P2P Edition

[![Deploy to GitHub Pages](https://github.com/gab371/royal-bluff/actions/workflows/deploy.yml/badge.svg)](https://github.com/gab371/royal-bluff/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](https://opensource.org/licenses/MIT)

**Royal Bluff** est un jeu d'intrigue, de bluff, de rôles cachés et d'assassinats multijoueur Peer-to-Peer standalone basé sur WebRTC, jouable directement dans votre navigateur sans serveur intermédiaire.

Inspiré du célèbre jeu de société *Coup*, cette version propose un design royal, luxueux et épuré avec des mécaniques de contestation et de contre-actions en temps réel.

---

## 🎮 Démo en Ligne

Jouez directement sur votre navigateur sans aucune installation :
👉 **[Jouer à la démo en ligne](https://gab371.github.io/royal-bluff/)**

---

## ✨ Fonctionnalités Clés

- **Connexion P2P Standalone** : Connexions directes de navigateur à navigateur grâce à **PeerJS**. Pas de base de données ni de serveur de jeu intermédiaire (seul un serveur de signalement public est utilisé pour connecter les pairs).
- **Design Royal Luxueux** : Interface épurée avec accents dorés et sombres, typographie élégante *Raleway* et *Playfair Display*, et animations soignées.
- **Résolution en Temps Réel** : Prise en charge des fenêtres de contre-actions (blocages, aides extérieures) et fenêtres de contestation (défis de rôles) pour tous les joueurs.
- **Tchat & Logs en Direct** : Suivi rigoureux de l'historique de chaque action avec code couleur thématique et salon de messagerie instantanée privé.
- **Sécurité et Arbitrage** : Le moteur de jeu en arrière-plan valide la conformité des contre-blocages et les résolutions automatiques d'influence perdues.

---

## 🛠️ Lancement Local

### Prérequis
- **Node.js** (v20 ou supérieur recommandé)
- **npm**

### Instructions

1. **Cloner le projet** :
   ```bash
   git clone https://github.com/gab371/royal-bluff.git
   cd royal-bluff
   ```
2. **Installer les dépendances** :
   ```bash
   npm install
   ```
3. **Lancer le serveur de développement** :
   ```bash
   npm run dev
   ```
4. **Ouvrir dans le navigateur** :
   Ouvrez `http://localhost:5173/` (ou le port indiqué par Vite).
   *Pour tester à deux sur la même machine, ouvrez un deuxième onglet ou un autre navigateur.*

5. **Compiler pour la production** :
   ```bash
   npm run build
   ```

---

## 🏛️ Architecture du Projet

Le projet suit des principes stricts de séparation des responsabilités pour garantir la testabilité et la maintenabilité :
- **`/src/core`** : Moteur de jeu pur (gestion des rôles cachés, résolution des défis et des assassinats, flux des tours) écrit en TypeScript pur, sans aucune dépendance UI ou réseau.
- **`/src/network`** : Gestionnaire de connexion P2P PeerJS et protocole de messages réseau.
- **`/src/hooks`** : Custom hooks liant l'état de jeu réactif et les événements réseau au cycle de vie de React.
- **`/src/components`** : Composants d'interface (plateau de jeu, lobby, tchat, journal).

---

## 📄 Licence

Ce projet est distribué sous licence MIT.
