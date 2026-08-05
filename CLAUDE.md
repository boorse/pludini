# Pludini — inventaire naturaliste collaboratif

Application web (React + Vite) pour recenser la faune et la flore d'une propriété
en Lettonie (Vidzeme, près de Cēsis). Quatre contributeurs partagent leurs
observations, photos et individus reconnus.

## Lancer le projet en local
```
npm install
npm run dev      # serveur de développement, ouvre http://localhost:5173
npm run build    # compile pour la production (doit afficher "✓ built")
```
TOUJOURS lancer `npm run dev` et vérifier le rendu dans le navigateur après
chaque changement. Le build qui passe ne garantit pas que le site fonctionne :
la plupart des bugs sont des erreurs d'exécution (composant hors portée, donnée
manquante) que seul le navigateur révèle. Ouvrir la console (Cmd+Option+J).

## Déploiement
GitHub (boorse/pludini) → Vercel déploie automatiquement à chaque push sur main.
IMPORTANT : dans index.html le script doit être "./src/main.jsx" (chemin relatif),
jamais "/src/main.jsx" — une barre initiale casse le build Vercel.
Domaine de production : pludini.lv (acheté le 29/07/2026, 5 ans, via le
registrar du .lv). À brancher côté Vercel (Project Settings → Domains) puis
côté registrar (enregistrements DNS fournis par Vercel).

## Backend — Supabase (déjà configuré)
- URL et clé publique dans src/supabase.js
- Bucket "photos" (public) pour les images
- Deux tables : "photos" et "overrides" (colonne kind : named/species/player/
  spedit/sighting/todo/pin/zone/pintype/setting)
- Tout passe par le magasin central src/store.js (cache + synchronisation)

## Architecture des fichiers src/
- App.jsx — composant principal, navigation, fiches espèces, scores, badges, matrice
- data.js — données de base (espèces, catégories, joueurs, raretés, méthodes, badges)
- store.js — MAGASIN CENTRAL : cache, allSpecies/allPlayers/allCats, photos,
  familiers, observations, scoring live. Source de vérité à l'exécution.
- mindmap.jsx — carte mentale déployable (gestes tactiles, zoom, culling)
- screens.jsx — Calendrier, Territoire (carte satellite), Galerie, Par observateur
- satmap.jsx — carte satellite maison (tuiles Esri), pins, zones, tracés
- editui.jsx — formulaires : identité, nouvelle espèce, observation, méthodes
- photoui.jsx — import photos, compression + miniatures, filtre colorimétrique
- territory.js — calendrier des travaux, types de repères, centre GPS
- cloud.js — todos, pins, zones, types de repères, réglages (Supabase)
- i18n.js — traductions FR/RU (noms d'espèces, libellés)
- gradients.js — dégradés de repli quand pas de photo

## Règles apprises (à respecter)
- Tout composant hors du composant App doit déclarer localement ses données :
  `const SPECIES = allSpecies()` — ne jamais compter sur une variable de portée
  supérieure. C'est la cause n°1 des écrans blancs ("X is not defined").
- useSyncExternalStore exige un snapshot stable : renvoyer un tableau vide GELÉ
  et partagé, jamais un nouveau `[]` à chaque appel (sinon boucle infinie).
- La carte mentale ne synchronise React qu'au relâchement du geste, et seulement
  si un déplacement réel a eu lieu (sinon le re-rendu détruit le bouton cliqué).
- Photos : miniature 260px pour les vignettes, pleine résolution (thumb={false})
  pour bannières et image d'accueil.
- Après CHAQUE modification : vérifier dans le navigateur avant de continuer.

## Mot de passe du mode édition : arbalete

## État connu
Le site a accumulé des régressions sur les dernières itérations. Priorité :
relancer `npm run dev`, ouvrir la console, corriger les erreurs d'exécution une
par une jusqu'à ce que la page s'affiche, puis vérifier chaque écran
(Le Conservatoire, Territoire, Calendrier, Galerie, Scores).
