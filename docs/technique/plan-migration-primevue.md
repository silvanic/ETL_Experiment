# Plan de migration vers PrimeVue

## Objectif
Industrialiser l'interface de l'éditeur ETL en migrant progressivement les composants UI vers PrimeVue, sans impacter la logique métier du pipeline ni le canvas.

## Périmètre
- Cible PrimeVue: shell applicatif, formulaires, panneaux, console, notifications, confirmations.
- Hors périmètre initial: logique domaine, moteur d'exécution, store métier, interactions canvas spécifiques.

## Phases

### 1) Cadrage
- Définir les conventions UI (tokens, composants standards, états loading/empty/error).
- Prioriser les composants: InspectorPanel, NodePalette, RunConsole, puis PipelineEditorPage.

### 2) Foundation technique
- Installer PrimeVue et PrimeIcons.
- Configurer PrimeVue globalement dans `src/main.ts`.
- Ajouter un preset de thème et lier le mode sombre à `[data-theme='dark']`.

### 3) Design tokens
- Harmoniser les variables CSS globales dans `src/style.css`.
- Garantir la compatibilité avec les composants PrimeVue et le thème existant.

### 4) Quick wins de migration
- Migrer `InspectorPanel.vue` vers InputText/Select/Textarea.
- Migrer `NodePalette.vue` vers Panel/Button/Tag.
- Migrer `RunConsole.vue` vers Card/Tag/Message.

### 5) Interactions avancées
- Ajouter Toast pour feedback global.
- Ajouter ConfirmDialog pour actions destructives.
- Normaliser les états d'erreur et d'exécution.

### 6) Stabilisation
- Vérifier build, smoke tests UI, et absence de régression pipeline.
- Nettoyer le CSS devenu obsolète.

## Définition of Done
- PrimeVue actif dans l'application.
- Au moins les composants latéraux/console migrés.
- Le canvas fonctionne comme avant.
- Build TypeScript/Vite valide.
- Plan documenté et traçable dans ce dossier.

## Journal d'exécution
- 2026-06-11: plan créé et phase foundation lancée.
- 2026-06-11: PrimeVue + PrimeIcons installés, configuration globale ajoutée dans src/main.ts.
- 2026-06-11: migrations Quick Wins exécutées sur InspectorPanel, NodePalette et RunConsole.
- 2026-06-11: build validé (`npm run build`) sans erreur TypeScript/Vue.
- 2026-06-11: ergonomie améliorée avec onglets Flow/Console dans PipelineEditorPage pour garantir l'accès à la console.
- 2026-06-11: build revalidé après refactor Tabs PrimeVue.
- 2026-06-11: corrigé affichage logs console - remplacement Card par div simple pour éviter problème rendu PrimeVue.
