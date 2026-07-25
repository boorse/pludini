# 🌿 Pludini — Inventaire naturaliste collaboratif

Application web pour répertorier la faune et la flore de la propriété (Vidzeme, Lettonie).

## Lancer en local
```bash
npm install
npm run dev
```
Ouvre http://localhost:5173

## Déployer sur Vercel (gratuit)
1. Pousse ce dossier sur un repo GitHub
2. Sur vercel.com : Import Project → sélectionne le repo → Framework "Vite" → Deploy
3. L'URL générée (ex. pludini.vercel.app) est partageable sur téléphone et PC

## Modifier les données
Tout est dans `src/data.js` : espèces, joueurs, badges, règles de points.

## Structure
- `src/App.jsx` — interface complète (Explorer / Matrice / Scores / Badges)
- `src/data.js` — données et logique de points
- `src/main.jsx` — point d'entrée React
