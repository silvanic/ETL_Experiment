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
**Contient**: 7 boutons nœuds (draggable)  
**À modifier**: Si ajout type nœud ou UI palette

#### `InspectorPanel.vue` ⭐
**Rôle**: Éditeur config nœud sélectionné  
**Contient**: Switch 7 dialogues config (1 par type)  
**À modifier**: Ajouter champ config, UI éditeur, validations

#### `RunConsole.vue`
**Rôle**: Affichage logs exécution  
**Contient**: Tableau ExecutionLog[] chronologique  
**À modifier**: Format logs, colonnes affichées, export

#### `CustomStepEdge.vue`
**Rôle**: Arête customisée avec labels  
**Affiche**: Labels pour condition/filter branches  
**À modifier**: Style arêtes, animation, positionnement labels

#### `dialogs/`
**Rôle**: Dialogues modaux (4 fichiers)

| Dialog | Rôle | Trigger |
|--------|------|---------|
| `DialogPipelineLoad.vue` | Charger pipeline sauvegardé | Bouton "Ouvrir" |
| `DialogPipelineRun.vue` | Exécution + RunConsole | Bouton "Run" |
| `DialogPipelineSettings.vue` | Éditer nom/description pipeline | Menu settings |
| `DialogPipelineHelp.vue` | Documentation types nœuds | Bouton help |

---

### `src/modules/pipeline/domain/` (Types + constantes)

#### `types.ts` ⭐
**Taille**: 300+ lignes  
**Contient**:
- `NodeType = 'start' | 'api' | 'setVariable' | 'condition' | 'filter' | 'transform' | 'output'`
- 7 config interfaces (StartNodeConfig, ApiNodeConfig, etc.)
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
- Substitution templates `{{varName}}`

**À consulter**: Avant utiliser variables dans conditions/filters

---

### `src/modules/pipeline/engine/` (Moteur exécution)

#### `runPipeline.ts` ⭐
**Rôle**: Orchestration exécution pipeline  
**Contient**: Boucle principale, gestion queue, visitedNodes, error handling  
**Entrée**: PipelineDefinition  
**Sortie**: ExecutionRun

**À consulter**: Pour comprendre flux exécution  
**À modifier**: Ajouter logique branchement ou error handling

#### `nodeExecutors.ts` ⭐
**Rôle**: 7 exécuteurs typés (1 par type nœud)  
**Contient**:
- `executeStart()`, `executeApi()`, `executeSetVariable()`, `executeCondition()`, `executeFilter()`, `executeTransform()`, `executeOutput()`
- Map `executorByType`

**À consulter**: Pour comprendre logique chaque nœud  
**À modifier**: Ajouter logique exécution nœud

#### `pathUtils.ts`
**Rôle**: Accès path JSON (like lodash get/set)  
**Contient**: `getValueByPath()`, `setValueByPath()`  
**Support**: Notation pointée (ex: `result.data.items[0].name`)

**À consulter**: Avant manipuler paths  
**À modifier**: Enrichir support paths complexes

#### `variableContext.ts`
**Rôle**: Contexte variables pendant exécution  
**Contient**: Logique évaluation variables

#### `executorTypes.ts`
**Rôle**: Types exécuteurs  
**Contient**: `NodeExecutor<T>`, `ExecutionResult`

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
**Affichage**: DialogPipelineHelp

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

### 🔧 Modifier config nœud

1. ✏️ `types.ts` — Ajouter champ interface config
2. ✏️ `schema.ts` — Ajouter validation Zod (parallèle)
3. ✏️ `defaults.ts` — Ajouter valeur défaut
4. ✏️ Dialogue config (`InspectorPanel.vue` ou `dialogs/*.vue`) — Ajouter champ UI
5. ✏️ `nodeExecutors.ts` — Utiliser champ config si besoin

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
| `PipelineCanvas.vue` | ~200 | Canvas interactions |
| `InspectorPanel.vue` | ~150 | Config UI |

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
