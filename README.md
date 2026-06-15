# ETL Experiment

Une application web de création et d'exécution de pipelines ETL (Extract, Transform, Load) via une interface visuelle.

## Présentation

ETL Experiment permet de concevoir des pipelines de traitement de données de manière graphique, en connectant des nœuds représentant chaque étape (extraction, transformation, chargement). Les pipelines peuvent ensuite être exécutés directement depuis l'interface, avec un suivi en temps réel via la console d'exécution.

## Stack technique

- **Vue 3** + **TypeScript** — framework frontend et typage statique
- **Vite** — bundler et serveur de développement
- **Vue Flow** — moteur de rendu du canvas de pipeline
- **Pinia** — gestion de l'état de l'éditeur

## Lancer le projet
```bash
npm install
npm run dev
```
