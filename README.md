# Le Ticket — calculateur de calories (terminal)

App React (Vite) qui reprend le fonctionnement du script CLI Python :
tu tapes un aliment, tu choisis parmi les résultats Open Food Facts,
tu donnes la quantité en grammes, et ça s'ajoute au ticket. Tape `total`
ou `fin` pour voir le récapitulatif.

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvre l'URL affichée (en général http://localhost:5173).

## Build de production

```bash
npm run build
```

Ça génère un dossier `dist/` prêt à être déployé.

## Déployer sur Netlify

**Option A — drag & drop (le plus simple)**
1. `npm install && npm run build` en local
2. Va sur https://app.netlify.com/drop
3. Glisse le dossier `dist/` généré

**Option B — via un dépôt Git (recommandé pour les mises à jour)**
1. Pousse ce dossier sur GitHub
2. Sur Netlify : "Add new site" → "Import an existing project"
3. Connecte ton dépôt. Le fichier `netlify.toml` fourni configure déjà :
   - build command : `npm run build`
   - dossier publié : `dist`

Aucune variable d'environnement ni clé API n'est nécessaire : l'app
interroge directement l'API publique d'Open Food Facts depuis le
navigateur de l'utilisateur.
