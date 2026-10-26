# Projet apprenant — TP1 : connecter Express à Groq

## Installation

```bash
npm install
```

Dupliquez `.env.example`, renommez la copie `.env`, puis renseignez votre clé API Groq.

```bash
npm run dev
```

Ouvrez `http://localhost:3000`.

## Mission

Dans `server.js`, réalisez les trois zones `TODO` afin de remplacer la réponse simulée par une réponse réelle de Groq.

Le contrat de l’API ne doit pas changer : `{ prompt }` vers `{ answer }`.

Ne placez jamais la clé API dans `public/app.js`.
