# Comment reprendre Pludini avec Claude Code

## 1. Installer Claude Code (une seule fois)
Ouvrir le Terminal (Applications → Utilitaires → Terminal) et coller :

    curl -fsSL https://claude.ai/install.sh | bash

Puis lancer, pour se connecter (ouvre le navigateur) :

    claude

Il faut un abonnement Claude Pro (20 €/mois minimum).

## 2. Décompresser ce dossier
Mettre le contenu du zip dans un dossier, par exemple ~/pludini

## 3. Ouvrir Claude Code dans le dossier
Dans le Terminal :

    cd ~/pludini
    claude

## 4. Première demande à taper (copier-coller)

    Lis le fichier CLAUDE.md, puis lance "npm install" et "npm run dev".
    Ouvre le site, repère les erreurs dans la console et corrige-les une par
    une jusqu'à ce que la page s'affiche correctement. Avance par petites
    étapes et vérifie le rendu après chaque correction.

## 5. Sauvegarder quand ça marche
Quand le site fonctionne, demander :

    Fais un commit git avec un message clair, pour que je puisse revenir à
    cette version si besoin.

## Bon à savoir
- On parle en français normal, comme dans le chat.
- Quand il demande d'autoriser une action : répondre oui.
- Toujours avancer par petits pas et vérifier le site entre chaque changement.
- En cas de problème : "reviens à la dernière version qui marchait".
