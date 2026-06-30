# Architecture ETL Experiment

## Vue d'ensemble
ETL Experiment est une application Vue 3 + TypeScript permettant de concevoir et exécuter des pipelines ETL via une interface visuelle. Les pipelines sont composés de nœuds connectés par des arêtes, exécutés séquentiellement avec branchement logique.

**Techno clés**: Vue 3, TypeScript, Vue Flow (canvas), Pinia (state), Zod (validation), i18n (FR/EN)

---

## Architecture des répertoires

```
src/
├── main.ts                                # Bootstrap Vue + Pinia + i18n
├── App.vue                                # Racine (Toast + PipelineEditorPage)
└── modules/pipeline/
    ├── components/                        # Composants Vue
    │   ├── PipelineEditorPage.vue        # Page principale (3-colonne layout)
    │   ├── PipelineHelpPage.vue          # Page d'aide dédiée (documentation)
    │   ├── help/                         # Pages aide (overview, node, example, FAQ)
    │   ├── PipelineCanvas.vue            # Canvas Vue Flow + gestion nœuds/arêtes
    │   ├── NodePalette.vue               # Palette nœuds draggables
    │   ├── InspectorPanel.vue            # Éditeur config nœud sélectionné
    │   ├── RunConsole.vue                # Affichage logs exécution
    │   ├── CustomStepEdge.vue            # Arête avec labels
    │   └── dialogs/
    │       ├── DialogPipelineLoad.vue     # Charger pipeline
    │       ├── DialogPipelineRun.vue      # Exécution + console
    │       └── DialogPipelineSettings.vue # Éditer infos pipeline
    │
    ├── domain/                            # Types, schémas, constantes
    │   ├── types.ts                       # Types TypeScript (300+ lignes)
    │   ├── schema.ts                      # Validation Zod + transformations
    │   ├── defaults.ts                    # Factories et valeurs par défaut
    │   ├── typeGuards.ts                  # Gardes de type
    │   └── variables.ts                   # Gestion variables pipeline
    │
    ├── engine/                            # Moteur d'exécution
    │   ├── runPipeline.ts                 # Orchestration exécution (boucle + état)
    │   ├── nodeExecutors.ts               # Exécuteurs typés (1 par type de nœud)
    │   ├── pathUtils.ts                   # Accès path JSON (get/set)
    │   ├── variableContext.ts             # Contexte variables pendant exécution
    │   ├── executorTypes.ts               # Types exécuteurs
    │   ├── nodeExecutors.spec.ts          # Tests exécuteurs
    │   ├── pathUtils.spec.ts              # Tests path utilities
    │   └── runPipeline.spec.ts            # Tests orchestration
    │
    ├── stores/
    │   └── pipelineEditorStore.ts         # Pinia: gestion état éditeur
    │
    ├── services/
    │   └── pipelineStorage.ts             # localStorage persistance
    │
    └── data/
        ├── changelog_en.json
        └── changelog_fr.json
```

---

## Types de données principaux

### PipelineNode
```ts
{
  id: string                      // Unique ID
  type: string                    // Doit correspondre à NodeType
  position: { x: number; y: number }
  data: {
    type: NodeType              // start|api|setVariable|condition|filter|transform|map|iterate|subflow|output
    label: string               // Affichage
    name?: string               // Optional custom name
    config: NodeConfigMap[T]    // Config typée selon type
  }
  draggable?: boolean
  sourcePosition?: Position     // Vue Flow
  targetPosition?: Position     // Vue Flow
}
```

### PipelineEdge
```ts
{
  id: string                    // Unique ID
  source: string                // ID nœud source
  target: string                // ID nœud destination
  label?: string                // Affiché sur arête
  data?: {
    branch?: 'true'|'false'|'filtered'|'rejected'  // Pour condition/filter
  }
}
```

### PipelineDefinition
```ts
{
  id: string                    // UUID
  name: string
  version: number               // Incrémenté à chaque save
  nodes: PipelineNode[]
  edges: PipelineEdge[]
  variables: PipelineVariable[]
  environments?: PipelineEnvironment[]
  activeEnvironmentId?: string
  updatedAt: string             // ISO timestamp
}
```

### ExecutionRun
```ts
{
  id: string                    // UUID exécution
  startedAt: string             // ISO timestamp
  finishedAt: string
  success: boolean
  logs: ExecutionLog[]          // Un par nœud visité
  errorMessage?: string
}
```

---

## Types de nœuds (10 types)

| Type | Rôle | Config | Sortie |
|------|------|--------|--------|
| **start** | Démarrage pipeline | `note?: string` | Contexte vide `{}` |
| **api** | Requête HTTP | URL, méthode, headers, body, outputPath | Réponse JSON stockée |
| **setVariable** | Extrait variables | `{extractPath, variableName}[]` | Variables mises à jour |
| **condition** | Branchement logique | leftPath, operator, rightType/rightValue | 2 arêtes: true/false |
| **filter** | Filtre array | sourcePath, itemPath, operator, outputPath/rejected | 2 arêtes: filtered/rejected |
| **transform** | Transformation données | mode (pickPath\|assignLiteral), paths | Contexte modifié |
| **map** | Mapping tableau | sourcePath, outputPath, mappings[] | Tableau transformé |
| **iterate** | Boucle conteneur | `sourcePath` (tableau) | Exécute les enfants pour chaque item |
| **subflow** | Conteneur mono-run | Pas de config obligatoire | Exécute les enfants une seule fois |
| **output** | Résultat final | `outputPath: string` | Terminal (aucune sortie) |

---

## Flux d'exécution

```
1. runPipeline(definition) déclenché par DialogPipelineRun
   ↓
2. Validation schéma + initialisation ExecutionContext
   ↓
3. Boucle d'exécution par scope:
  queue = [START.id]
   guard = MAX_EXECUTION_STEPS
   
   while (queue.length > 0 && success) {
     nodeId = queue.shift()
     
     node = findNode(nodeId)
     executor = executorByType[node.data.type]
    result = executor(node, context, graph, executionState)
     
     context = result.context

     if (node.type === 'iterate') {
       // scope enfant exécuté pour chaque item
       // variables runtime disponibles: __currentItem / __currentIndex
     }

     if (node.type === 'subflow') {
       // scope enfant exécuté une seule fois
     }

     queue.push(nextNodesSelonBranchEtScope)
   }
   ↓
4. Retourne ExecutionRun avec logs et résultat final
   ↓
5. Store.currentRun = result
6. RunConsole affiche logs temps réel
7. UI met à jour le statut + affiche le résultat
```

**Branchement**:
- Condition retourne 2 nextNodeIds (true branch + false branch)
- Filter retourne 2 nextNodeIds (filtered branch + rejected branch)
- Autres types retournent 1 ou 0 nextNodeIds
- Les enfants d'un conteneur sont exécutés dans le scope du parent (`parentNode`)

---

## Pinia Store (pipelineEditorStore.ts)

### État mutable
```ts
currentPipeline: PipelineDefinition
currentRun: ExecutionRun | null
viewSettings: { /* zoom, pan, layout */ }
isRunning: boolean
```

### Actions principales
- **Nœuds**: `addNodeByType(type)`, `updateNodeConfig(id, config)`, `removeNode(id)`
- **Arêtes**: `addEdge(connection)`, `removeEdge(id)`, `applyEdgeChanges(changes)`
- **Variables**: `addVariable()`, `updateVariable(id, ...)`, `removeVariable(id)`
- **Environnements**: `setActiveEnvironment(id)`, `addEnvironment(name)`, `renameEnvironment(id, name)`, `removeEnvironment(id)`
- **Persistance**: `saveCurrentPipeline()`, `loadPipeline(id)`, `listSavedPipelines()`
- **Exécution**: `runCurrentPipeline()` → appelle `runPipeline()` du moteur
- **Pipelines**: `createPipeline()`, `openNewPipeline()`, `closeCurrentPipeline()`

---

## Services

### pipelineStorage.ts
Persistance localStorage avec index maintenu:
- `savePipeline(def)` — sauvegarde + met à jour index
- `loadSavedPipeline(id)` — charge par ID
- `listSavedPipelines()` — retourne sommaires triés par date desc
- Support héritage format legacy via Zod transform (dont ancien type `subPipeline` migré en `subflow`)

**Clés localStorage**:
```
etl-experiment.pipelines.index.v1        // Index des pipelines sauvegardés
etl-experiment.pipelines.current.v1      // ID du pipeline courant
etl-experiment.pipelines.entry.v1.{id}   // Contenu pipeline
```

### pathUtils.ts
Accès paths JSON (type lodash get/set):
- `getValueByPath(obj, path)` — récupère valeur nested
- `setValueByPath(obj, path, value)` — assigne valeur nested
- Support notation pointée (ex: `result.data.items[0].name`)
- Support bracket dynamique (ex: `result[__currentIndex].name`)

### variables.ts
Gestion variables pipeline:
- `buildVariableMap(variables)` — Record<name, value>
- `isValidVariableName(name)` — validation format
- Résolution des variables globales via `#variable`
- En contexte template (Map/Transform): utiliser `{chemin}` et `{#variable}`

---

## Composants principaux

### PipelineEditorPage
Layout 3-colonnes:
- **Gauche**: NodePalette (palette nœuds)
- **Centre**: PipelineCanvas (canvas Vue Flow)
- **Droite**: InspectorPanel (config nœud)
- **Bas**: Boutons (Nouveau, Ouvrir, Enregistrer, Run)

### PipelineCanvas
- Moteur Vue Flow + sync avec store
- Drag NodePalette → addNode (placement center)
- Click nœud → select dans store
- Rendu arêtes customisées (CustomStepEdge)

### InspectorPanel
Dialogue config conditionnelle par type nœud:
- Config dédiée pour types classiques + infos conteneur (`iterate` et `subflow`)
- Validation Zod client
- Update store on change

### RunConsole
Affichage logs ExecutionRun:
- Groupement des logs par nœud exécuté
- Détails dépliables (payload/erreurs)
- Affichage des variables effectives et de l'environnement actif

### Systeme de couleurs conteneur (Iterate/Subflow)

Le projet utilise un systeme de tokens CSS centralises pour les conteneurs afin d'eviter la duplication de couleurs entre composants.

Point d'entree:
- `src/style.css` definit les tokens globaux `--flow-iterate-*` et `--flow-subflow-*`.

Responsabilites par composant:
- `PipelineCanvas.vue`: rend les badges de type conteneur et les boutons d'ajout d'enfant avec les tokens de conteneur.
- `NodePalette.vue`: applique les accents visuels Iterate/Subflow pour les entrees de palette.
- `RunConsole.vue`: applique les couleurs de conteneur sur les sections et propage la teinte aux niveaux internes (panels/logs/durees/group-id) via une variable locale de section.

Principe de propagation dans la console:
- Chaque section conteneur definit `--container-info-border` a partir du token global (`--flow-iterate-panel-border` ou `--flow-subflow-panel-border`).
- Les sous-elements internes reutilisent cette variable pour conserver une coherence de niveau 1 a n.

Regle d'evolution:
- Toute nouvelle couleur specifique Iterate/Subflow doit etre creee d'abord dans `src/style.css`, puis consommee dans les composants via `var(...)`.
- Eviter les valeurs hardcodees dans les SFC pour ces deux types.

---

## Moteur d'exécution (engine/)

### nodeExecutors.ts
Exécuteurs typés par type de nœud:
```ts
type NodeExecutor<T extends NodeType> = (
  node: PipelineNode<T>,
  context: ExecutionContext,
  graph: ExecutionGraph,
  scope: ExecutionScope
) => ExecutorResult
```

Chaque exécuteur:
1. Valide config nœud
2. Effectue logique métier
3. Retourne metadata (`message`, `details`, `nextBranch`, `scopedData`) pour l'orchestrateur

### runPipeline.ts
Orchestration:
- Gère queue par scope + garde-fou `MAX_EXECUTION_STEPS`
- Évite boucles infinies via guard (journalise erreur système)
- Error handling avec logging
- Snapshots données pour viewing (hors clés internes `__*`)

---

## Points clés et pièges

### Vue Flow node placement
⚠️ **Bug**: Position NaN/Infinity fige UI
✅ **Solution**: Valider viewport avant centrage, fallback null → placement grille store

### Variables templates
- Variables globales: `#variable`
- Templates (Map/Transform): `{chemin}` et `{#variable}`
- Validation: identifiant valide (alphanumérique + _ + $)
- Scope: Variables changent à SetVariable node
- Iterate expose `__currentItem` et `__currentIndex` dans ses enfants

### Paths JSON
- Notation pointée: `response.data.items[0].value`
- Notation bracket: `response.data.items[0].name`
- Bracket dynamique: `result[__currentIndex].name`
- Implémentation custom (pas lodash)
- Peut échouer silencieusement si le path est invalide

### Arêtes condition/filter
- Label: `data.branch` → 'true'/'false' ou 'filtered'/'rejected'
- Ordre: Pas garanti pour multiple branches
- Validation: Doit avoir 1+ sortant (pas encore forcé)

### localStorage
- Limite: ~5-10MB dépend navigateur
- Index: Pivot pour lister sans charger
- Héritage: Support ancien format

---

## Workflows d'interaction

**1. Créer pipeline**
   → Store.createPipeline() → PipelineDefinition + nœud START
   → PipelineCanvas réactif affiche changement

**2. Éditer nœud**
   → Click nœud → Store.selectNode() → InspectorPanel affiche config
   → Modification → Store.updateNodeConfig() → Validation Zod

**3. Connexion nœuds**
   → Drag arête Vue Flow → Store.addEdge() → Validation
   → CustomStepEdge render avec label

**4. Exécution**
   → Click Run → DialogPipelineRun → Store.runCurrentPipeline()
   → runPipeline() orchestre → Logs temps réel → RunConsole

**5. Sauvegarde**
   → Store.saveCurrentPipeline() → pipelineStorage → localStorage + index

---

## Scripts

```bash
npm run dev      # Vite dev server
npm run build    # Vue-TSC check + Vite bundle
npm run test     # Vitest
```

Tests:
- `nodeExecutors.spec.ts` — exécuteurs
- `pathUtils.spec.ts` — path utilities  
- `runPipeline.spec.ts` — orchestration
