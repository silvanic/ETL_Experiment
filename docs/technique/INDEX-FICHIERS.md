# Index des fichiers - ETL Experiment

## 🎯 Fichiers de démarrage rapide

| Fichier | Rôle | À lire si... |
|---------|------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Vue complète de l'app | Première fois sur le projet |
| `../../../README.md` | Présentation générale | Vous débutez |
| `vite.config.ts` | Config Vite | Problèmes build/bundling |
| `tsconfig.json` | Config TypeScript | Erreurs TS ou imports |
| `package.json` | Dépendances | Besoin d'ajouter libs |

---

## 📁 Structure complète avec annotations

### `src/App.vue`
**Rôle**: Racine Vue  
**Contient**: Toast (notifications) + PipelineEditorPage (mount)  
**À modifier**: Rarement (layout global)

### `src/main.ts`
**Rôle**: Bootstrap application  
**Contient**: Vue + Pinia + i18n + PrimeVue init  
**À modifier**: Rarement (configurations globales seulement)

### `src/style.css`
**Rôle**: Styles globaux  
**À modifier**: Thème global ou overrides PrimeVue

**Convention conteneurs Iterate/Subflow**:
- Source unique des tokens visuels `--flow-iterate-*` et `--flow-subflow-*`.
- Voir aussi: [PATTERNS-CONVENTIONS.md](./PATTERNS-CONVENTIONS.md) section "Tokens visuels centralisés".
- Impact direct sur:
	- `PipelineCanvas.vue` (badges + bouton ajout enfant)
	- `NodePalette.vue` (accents visuels conteneurs)
	- `RunConsole.vue` (bordures de sections, niveaux enfants, durées)

### `src/modules/pipeline/components/`

#### `PipelineEditorPage.vue` ⭐
**Rôle**: Page principale, layout 3-colonnes  
**Enfants**:
- NodePalette (gauche)
- PipelineCanvas (centre)
- InspectorPanel (droite)
- Boutons top (Nouveau, Ouvrir, Enregistrer)

**État**: Inject pipelineEditorStore  
**À modifier**: Layout UI, boutons principaux

#### `PipelineCanvas.vue` ⭐
**Rôle**: Canvas Vue Flow interactif  
**Gère**:
- Sync nœuds/arêtes store ↔ Vue Flow
- Drag NodePalette → addNode (placement center)
- Click nœud → select store
- Contrôles zoom/pan
- Rendu CustomStepEdge
- Validation edges

**À modifier**: Interactions canvas, placement nœuds, validations

#### `NodePalette.vue`
**Rôle**: Palette nœuds draggables  
**Contient**: 10 entrées nœuds (dont conteneurs `iterate` et `subflow`)  
**À modifier**: Si ajout type nœud ou UI palette

#### `InspectorPanel.vue` ⭐
**Rôle**: Éditeur config nœud sélectionné  
**Contient**: Formulaires de config + panneaux d'information pour conteneurs  
**À modifier**: Ajouter champ config, UI éditeur, validations

#### `RunConsole.vue`
**Rôle**: Affichage logs exécution  
**Contient**: Logs groupés par nœud + détails dépliables + variables effectives et environnement actif  
**À modifier**: Format logs, colonnes affichées, export

#### `CustomStepEdge.vue`
**Rôle**: Arête customisée avec labels  
**Affiche**: Labels pour condition/filter branches  
**À modifier**: Style arêtes, animation, positionnement labels

#### `dialogs/`
**Rôle**: Dialogues modaux (3 fichiers)

| Dialog | Rôle | Trigger |
|--------|------|---------|
| `DialogPipelineLoad.vue` | Charger pipeline sauvegardé | Bouton "Ouvrir" |
| `DialogPipelineRun.vue` | Exécution + RunConsole | Bouton "Run" |
| `DialogPipelineSettings.vue` | Éditer nom/description pipeline | Menu settings |

#### `PipelineHelpPage.vue`
**Rôle**: Page dédiée à la documentation utilisateur (nouvel onglet)  
**Contient**: Header navigation + intégration du contenu d'aide  
**Trigger**: Menu Help depuis l'éditeur

#### `help/` (dossier)
**Rôle**: Pages d'aide modulaire (nœuds, concepts, exemples, FAQ)  
**Contient**:
- `HelpOverviewPage.vue`
- `HelpNodePage.vue`
- `HelpExamplePage.vue`
- `HelpFaqSection.vue`
- `helpDocData.ts`

---

### `src/modules/pipeline/domain/` (Types + constantes)

#### `types.ts` ⭐
**Taille**: 300+ lignes  
**Contient**:
- `NodeType = 'start' | 'api' | 'setVariable' | 'condition' | 'filter' | 'transform' | 'map' | 'iterate' | 'subflow' | 'output'`
- Config interfaces par type (dont `MapNodeConfig`, `IterateNodeConfig`, `SubflowNodeConfig`)
- PipelineNode, PipelineEdge, PipelineDefinition
- ExecutionRun, ExecutionLog, ExecutionContext
- Variables pipeline

**À consulter**: Pour comprendre structure données  
**À modifier**: Ajouter champs config nœud (sinon aussi modifier schema.ts)

#### `schema.ts` ⭐
**Taille**: 200+ lignes  
**Contient**: Validation Zod pour tous types  
**Inclut**: Transformations (ex: héritage legacy headers format)  

**À consulter**: Avant modifier types  
**À modifier**: Ajouter validation pour nouveau champ (parallèle types.ts)

**Attention**: Zod transform peut have side effects, bien tester

#### `defaults.ts`
**Rôle**: Factories et valeurs par défaut  
**Contient**:
- `createInitialPipeline()` — nouveau pipeline vierge
- `createNode(type)` — crée nœud avec config par défaut
- `createEdge()` — crée arête

**À consulter**: Pour voir defaults  
**À modifier**: Changer valeurs par défaut nœuds

#### `typeGuards.ts`
**Rôle**: Gardes de type TypeScript  
**Contient**: Fonctions type guards (is*) et validations

**À consulter**: Avant utiliser type casting  
**À modifier**: Ajouter guard nouveau type

#### `variables.ts`
**Rôle**: Gestion variables pipeline  
**Contient**:
- `buildVariableMap()` — Record<name, value>
- `isValidVariableName()` — validation format
- Résolution variables globales `#variable`
- Support templates `{chemin}` et `{#variable}` dans Map/Transform

**À consulter**: Avant utiliser variables dans conditions/filters

---

### `src/modules/pipeline/engine/` (Moteur exécution)

#### `runPipeline.ts` ⭐
**Rôle**: Orchestration exécution pipeline  
**Contient**: Boucle principale, gestion queue/scopes, garde-fou anti-boucle, error handling  
**Entrée**: PipelineDefinition  
**Sortie**: ExecutionRun

**À consulter**: Pour comprendre flux exécution  
**À modifier**: Ajouter logique branchement ou error handling

#### `nodeExecutors.ts` ⭐
**Rôle**: Exécuteurs typés (1 par type nœud)  
**Contient**:
- `start`, `api`, `setVariable`, `condition`, `filter`, `transform`, `map`, `iterate`, `subflow`, `output`
- Map `executorByType`
- Résolution dynamique des chemins (dont index de tableau via bracket dynamique)

**À consulter**: Pour comprendre logique chaque nœud  
**À modifier**: Ajouter logique exécution nœud

#### `pathUtils.ts`
**Rôle**: Accès path JSON (like lodash get/set)  
**Contient**: `getValueByPath()`, `setValueByPath()`  
**Support**: Notation pointée + bracket + wildcard (ex: `result.data.items[0].name`, `result[__currentIndex].name`)

**À consulter**: Avant manipuler paths  
**À modifier**: Enrichir support paths complexes

#### `variableContext.ts`
**Rôle**: Contexte variables pendant exécution  
**Contient**: Logique évaluation variables

#### `executorTypes.ts`
**Rôle**: Types exécuteurs  
**Contient**: `NodeExecutor`, `ExecutorResult`, `ExecutionGraph`, `ExecutionState`

#### Tests
- `nodeExecutors.spec.ts` — tests tous exécuteurs
- `pathUtils.spec.ts` — tests path utilities
- `runPipeline.spec.ts` — tests orchestration

**À consulter**: Avant modifier exécuteurs (voir tests)  
**À modifier**: Ajouter tests nouveau code

---

### `src/modules/pipeline/stores/`

#### `pipelineEditorStore.ts` ⭐
**Rôle**: Pinia store, gestion état éditeur  
**État**:
- `currentPipeline: PipelineDefinition`
- `currentRun: ExecutionRun | null`
- `viewSettings, isRunning`

**Actions principales**:
- Nœuds: add/update/remove
- Arêtes: add/remove/applyChanges
- Variables: add/update/remove
- Persistance: save/load
- Exécution: run

**À consulter**: Pour voir état disponible  
**À modifier**: Ajouter action nouvelle fonctionnalité

**Accès**: `import { usePipelineEditorStore } from '@/modules/pipeline/stores/...'` → `const store = usePipelineEditorStore()`

---

### `src/modules/pipeline/services/`

#### `pipelineStorage.ts`
**Rôle**: localStorage persistance  
**Fonctions**:
- `savePipeline()`, `loadSavedPipeline()`, `listSavedPipelines()`
- `loadPipeline()` — charge ou crée nouveau
- Gestion index + legacy migration

**À consulter**: Avant manipuler localStorage  
**À modifier**: Ajouter export/import format custom

**localStorage keys**:
```
etl-experiment.pipelines.index.v1      // Index
etl-experiment.pipelines.current.v1    // ID courant
etl-experiment.pipelines.entry.v1.{id} // Contenu pipeline
```

---

### `src/modules/pipeline/data/`

#### `changelog_*.json`
**Rôle**: Changelogs traduits (FR/EN)  
**Affichage**: Dialog "Nouveautés" + section home

#### `src/i18n/`

#### `messages.json`
**Rôle**: Strings i18n (FR/EN)  
**Structure**: Hiérarchie clés
- `defaults.*` — valeurs par défaut
- `components.*` — strings composants
- `engine.*` — messages moteur
- `dialogs.*` — dialogues

**À consulter**: Avant ajouter texte UI  
**À modifier**: Ajouter traductions

#### `index.ts`
**Rôle**: Config i18n Vue  
**Setup**: Locale par défaut, fallback

---

## 🔄 Workflows fichiers

### 🆕 Ajouter type nœud

1. ✏️ `types.ts` — Ajouter `type: 'newType'` à NodeType union + config interface
2. ✏️ `schema.ts` — Ajouter schéma Zod validation
3. ✏️ `defaults.ts` — Ajouter factory `createNode('newType')`
4. ✏️ `nodeExecutors.ts` — Ajouter exécuteur `executeNewType()`
5. ✏️ `InspectorPanel.vue` — Ajouter dialogue config
6. ✏️ `messages.json` — Ajouter traductions
7. ✏️ `NodePalette.vue` — Ajouter bouton draggable
8. ✏️ Pages help (`components/help/*`) — Documenter le nœud
9. ✏️ Template(s) éventuel(s) (`data/templates.ts`) — Exemple guidé

### 🔧 Modifier config nœud

1. ✏️ `types.ts` — Ajouter champ interface config
2. ✏️ `schema.ts` — Ajouter validation Zod (parallèle)
3. ✏️ `defaults.ts` — Ajouter valeur défaut
4. ✏️ Dialogue config (`InspectorPanel.vue` ou `dialogs/*.vue`) — Ajouter champ UI
5. ✏️ `nodeExecutors.ts` — Utiliser champ config si besoin

### 🎨 Harmoniser couleurs conteneur

1. ✏️ `src/style.css` — Ajouter/ajuster token `--flow-...`
2. ✏️ `PipelineCanvas.vue` — Appliquer token sur badges/actions conteneur
3. ✏️ `NodePalette.vue` — Appliquer token sur accent et labels
4. ✏️ `RunConsole.vue` — Propager la couleur via `--container-info-border` pour tous les niveaux
5. ✅ Vérifier qu'il n'y a plus de hardcode couleur Iterate/Subflow dans les composants

### 🐛 Debug exécution pipeline

1. Ajouter log dans `runPipeline.ts` ou `nodeExecutors.ts`
2. Run `npm run test` — reproduire dans `.spec.ts` si possible
3. Vérifier `ExecutionLog[]` dans RunConsole
4. Contrôler `pathUtils.spec.ts` si paths impliqués

---

## 📊 Tailles fichiers

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `types.ts` | ~300 | Types définitions |
| `schema.ts` | ~250 | Validation |
| `nodeExecutors.ts` | ~400 | Exécuteurs |
| `runPipeline.ts` | ~150 | Orchestration |
| `pipelineEditorStore.ts` | ~300 | Pinia store |
| `PipelineCanvas.vue` | ~700 | Canvas interactions + toolbar + conteneurs |
| `InspectorPanel.vue` | ~1500 | Config UI + validation + help contextuelle |

---

## 🎓 Premiers pas

**Pour comprendre l'app**:
1. Lire [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Lire `types.ts` pour structure données
3. Parcourir `runPipeline.ts` pour flux exécution
4. Lancer `npm run dev` et tester UI

**Pour ajouter feature**:
1. Identifier fichiers concernés (voir Workflows ci-dessus)
2. Modifier types + schémas d'abord (bottom-up)
3. Implémenter UI/logique
4. Ajouter tests
5. Tester UI manuel

**Pour debug**:
1. Browser DevTools + Vue DevTools extension
2. Inspecter Pinia store en temps réel
3. Logs RunConsole pendant exécution
4. Tests unitaires `npm run test`
