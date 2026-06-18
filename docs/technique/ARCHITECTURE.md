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
    │   ├── PipelineCanvas.vue            # Canvas Vue Flow + gestion nœuds/arêtes
    │   ├── NodePalette.vue               # Palette nœuds draggables
    │   ├── InspectorPanel.vue            # Éditeur config nœud sélectionné
    │   ├── RunConsole.vue                # Affichage logs exécution
    │   ├── CustomStepEdge.vue            # Arête avec labels
    │   └── dialogs/
    │       ├── DialogPipelineLoad.vue     # Charger pipeline
    │       ├── DialogPipelineRun.vue      # Exécution + console
    │       ├── DialogPipelineSettings.vue # Éditer infos pipeline
    │       └── DialogPipelineHelp.vue     # Documentation
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
    │   ├── nodeExecutors.ts               # 7 exécuteurs typés (1 par type nœud)
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
    type: NodeType              // Start|Api|SetVariable|Condition|Filter|Transform|Output
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

## Types de nœuds (7 types)

| Type | Rôle | Config | Sortie |
|------|------|--------|--------|
| **start** | Démarrage pipeline | `note?: string` | Contexte vide `{}` |
| **api** | Requête HTTP | URL, méthode, headers, body, outputPath | Réponse JSON stockée |
| **setVariable** | Extrait variables | `{extractPath, variableName}[]` | Variables mises à jour |
| **condition** | Branchement logique | leftPath, operator, rightType/rightValue | 2 arêtes: true/false |
| **filter** | Filtre array | sourcePath, itemPath, operator, outputPath/rejected | 2 arêtes: filtered/rejected |
| **transform** | Transformation données | mode (pickPath\|assignLiteral), paths | Contexte modifié |
| **output** | Résultat final | `outputPath: string` | Terminal (aucune sortie) |

---

## Flux d'exécution

```
1. runPipeline(definition) déclenché par DialogPipelineRun
   ↓
2. Validation schéma + initialisation ExecutionContext
   ↓
3. Boucle d'exécution:
   queue = {START.id}
   visited = new Set()
   
   while (queue.length > 0) {
     nodeId = queue.shift()
     if (visited.has(nodeId)) continue  // Évite cycles
     visited.add(nodeId)
     
     node = findNode(nodeId)
     executor = executorByType[node.data.type]
     result = executor(node, context, edges)
     
     context = result.context
     logs.push(...result.logs)
     queue.push(...result.nextNodeIds)
   }
   ↓
4. Retourne ExecutionRun avec logs et résultat final
   ↓
5. Store.currentRun = result
6. RunConsole affiche logs temps réel
7. UI met à jour status + affiche résultat
```

**Branchement**:
- Condition retourne 2 nextNodeIds (true branch + false branch)
- Filter retourne 2 nextNodeIds (filtered branch + rejected branch)
- Autres types retournent 1 ou 0 nextNodeIds

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
- Support héritage format legacy via Zod transform

**Clés localStorage**:
```
etl-experiment.pipelines.index.v1        // Index des pipelines sauvegardés
etl-experiment.pipelines.current.v1      // ID du pipeline courant
etl-experiment.pipelines.entry.v1.{id}   // Contenu pipeline
```

### pathUtils.ts
Accès paths JSON (like lodash get/set):
- `getValueByPath(obj, path)` — récupère valeur nested
- `setValueByPath(obj, path, value)` — assigne valeur nested
- Support notation pointée (ex: `result.data.items[0].name`)

### variables.ts
Gestion variables pipeline:
- `buildVariableMap(variables)` — Record<name, value>
- `isValidVariableName(name)` — validation format
- Substitution templates `{{varName}}` dans strings

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
- 7 dialogues de config (1 par type)
- Validation Zod client
- Update store on change

### RunConsole
Affichage logs ExecutionRun:
- Tableau chronologique
- Couleurs level (info/error)
- Export logs option

---

## Moteur d'exécution (engine/)

### nodeExecutors.ts
7 exécuteurs typés:
```ts
type NodeExecutor<T extends NodeType> = (
  node: PipelineNode<T>,
  context: ExecutionContext,
  edges: PipelineEdge[]
) => ExecutionResult

interface ExecutionResult {
  success: boolean
  context: ExecutionContext    // Updated
  nextNodeIds: string[]        // Next nodes à exécuter
  logs: ExecutionLog[]         // Generated logs
}
```

Chaque exécuteur:
1. Valide config nœud
2. Effectue logique métier
3. Retourne contexte mis à jour + nextNodeIds

### runPipeline.ts
Orchestration:
- Gère queue + visitedNodes set
- Évite cycles infinis
- Error handling avec logging
- Snapshots données pour viewing

---

## Points clés et pièges

### Vue Flow node placement
⚠️ **Bug**: Position NaN/Infinity fige UI
✅ **Solution**: Valider viewport avant centrage, fallback null → placement grille store

### Variables templates
- Format: `{{variableName}}` dans strings
- Validation: identifiant valide (alphanumérique + _ + $)
- Scope: Variables changent à SetVariable node

### Paths JSON
- Notation pointée: `response.data.items[0].value`
- Implémentation custom (pas lodash)
- Peut silent fail si path invalide

### Arêtes condition/filter
- Label: `data.branch` → 'true'/'false' ou 'filtered'/'rejected'
- Ordre: Pas garanti pour multiple branches
- Validation: Doit avoir 1+ sortant (pas enforcé)

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
