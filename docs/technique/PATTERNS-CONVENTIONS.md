# Patterns & Conventions - ETL Experiment

## 📋 Conventions de nommage

### Variables et fonctions
```ts
// camelCase pour variables et fonctions
const currentPipeline: PipelineDefinition
function executeApi(node, context, edges) { }

// Private: _prefix
function _validatePath(path: string) { }

// Constants: UPPER_SNAKE_CASE
const MULTI_BRANCH_TYPES = new Set(['filter'])
const TRACED_TYPES_IN = new Set(['condition', 'filter', 'transform'])
```

### Types et Interfaces
```ts
// PascalCase toujours
interface PipelineNode { }
type NodeType = 'start' | 'api' | ...
type ExecutorResult = { ... }

// Config par type nœud: {Type}NodeConfig
interface StartNodeConfig { }
interface ApiNodeConfig { }
interface ConditionNodeConfig { }
```

### Fichiers
```
// Composants Vue: PascalCase.vue
PipelineEditorPage.vue
DialogPipelineLoad.vue

// Services/utils: camelCase.ts
pipelineStorage.ts
pathUtils.ts
variableContext.ts

// Tests: *.spec.ts
nodeExecutors.spec.ts
pathUtils.spec.ts

// Types/schémas: types.ts, schema.ts, defaults.ts
```

### Traductions i18n

```json
// Structure recommandée dans src/i18n/messages.json
{
  "fr": {
    "common": {
      "actions": { "save": "Enregistrer", "cancel": "Annuler" },
      "labels": { "variables": "Variables" },
      "ui": { "error": "Erreur" },
      "nodes": { "labels": { "api": "Requête API" } }
    }
  }
}
```

Règles:
- Centraliser dans `common` uniquement les libellés vraiment transverses.
- Préférer les références liées Vue i18n (`@:...`) plutôt que dupliquer la même chaîne.
- Conserver les clés contextuelles quand la sémantique peut diverger plus tard.
- Garder la même arborescence entre `fr` et `en`.
- En cas de refactor global, valider systématiquement avec `npm run build`.

Exemples:
- `@:common.actions.save`
- `@:common.labels.variables`
- `@:common.ui.error`
- `@:common.nodes.labels.api`

### Classes et enums
```ts
// Pas de classes dans ce projet
// Enums rarement utilisés (préfère union types)
```

---

## 🏗️ Patterns d'architecture

### Pattern: Validation en couches

```ts
// 1. Types TypeScript (types.ts)
interface ApiNodeConfig {
  url: string
  method: HttpMethod
  headers: Array<{ key: string; value: string }>
  // ...
}

// 2. Schéma Zod (schema.ts) — TOUJOURS après types
const apiConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', ...]),
  // ...
})

// 3. Usage dans composants (InspectorPanel.vue)
try {
  const result = apiConfigSchema.parse(config)
  // Safe to use result
} catch (error) {
  // Show error toast
}

// ✅ RÈGLE: Si modifier types.ts, TOUJOURS mettre à jour schema.ts
```

### Pattern: Exécuteurs typés

```ts
// Template exécuteur
function executeNewType<T extends NodeType>(
  node: PipelineNode<T>,
  context: ExecutionContext,
  graph: ExecutionGraph,
  executionState: ExecutionState,
): Promise<ExecutorResult> {
  const config = node.data.config as NodeConfigMap[T]
  
  // 1. Valider config
  try {
    // nodeConfigSchema[T].parse(config)
  } catch (error) {
    return Promise.resolve({
      message: 'Invalid config',
      details: error,
      exitMode: 'break',
    })
  }
  
  // 2. Exécuter logique
  try {
    // Core logic
    const result = await doSomething(config)
    
    // 3. Mettre à jour contexte
    return {
      message: 'Executed',
      dataOut: result,
      // Optionnel: nextBranch, childrenNodeIds, scopedData
    }
  } catch (error) {
    return {
      message: 'Execution failed',
      details: error,
      exitMode: 'break',
    }
  }
}

// Ajouter à map
export const executorByType: Record<NodeType, NodeExecutor> = {
  // ...
  newType: executeNewType,
  // ...
}
```

### Pattern: Nœuds conteneurs (`iterate`, `subflow`)

```ts
// Conteneur = nœud parent avec enfants (parentNode)
// Iterate: exécute les enfants pour chaque item
// Subflow: exécute les enfants une seule fois

function isContainerNodeType(type: NodeType): boolean {
  return type === 'iterate' || type === 'subflow'
}
```

Règles:
- Ne pas connecter directement un enfant de conteneur vers un nœud hors scope.
- Créer un `start` interne lors de la création du conteneur.
- Interdire les conteneurs imbriqués si la règle métier/store l'impose.
- Pour Iterate, les variables runtime `__currentItem` et `__currentIndex` sont disponibles uniquement dans le scope enfant.

### Pattern: Store Pinia actions

```ts
// Actions pures (pas de side effects)
// Gestion état atomique

export const usePipelineEditorStore = defineStore('pipelineEditor', () => {
  // Ref state
  const currentPipeline = ref<PipelineDefinition>(createInitialPipeline())
  const currentRun = ref<ExecutionRun | null>(null)
  
  // Computed (reactive)
  const logs = computed(() => currentRun.value?.logs ?? [])
  
  // Actions (mutations)
  const updateNodeConfig = (id: string, config: NodeConfig) => {
    const node = currentPipeline.value.nodes.find(n => n.id === id)
    if (!node) return
    
    // Mutation directe (ok dans Pinia 3)
    node.data.config = config
    
    // No return value
  }
  
  // Async actions
  const runCurrentPipeline = async () => {
    if (isRunning.value) return
    isRunning.value = true
    
    try {
      const result = await runPipeline(currentPipeline.value)
      currentRun.value = result
    } finally {
      isRunning.value = false
    }
  }
  
  // Expose only what needed
  return {
    currentPipeline,
    currentRun,
    logs,
    updateNodeConfig,
    runCurrentPipeline,
    // ...
  }
})

// ✅ RÈGLE: Ne jamais return promise sur mutation
// ✅ RÈGLE: Flag isRunning pour async operations
// ✅ RÈGLE: Try/finally pour cleanup
```

### Pattern: Gestion Dialogues Vue

```vue
<script setup lang="ts">
import { ref } from 'vue'
import Dialog from 'primevue/dialog'

const isOpen = ref(false)

const handleOpen = () => {
  isOpen.value = true
}

const handleClose = () => {
  isOpen.value = false
}

const handleConfirm = async () => {
  try {
    // Action
    await store.saveCurrentPipeline()
    handleClose()
    // Optionnel: useToast().add({ severity: 'success', ... })
  } catch (error) {
    // useToast().add({ severity: 'error', ... })
  }
}
</script>

<template>
  <Dialog v-model:visible="isOpen" :modal="true" header="Title">
    <form @submit.prevent="handleConfirm">
      <!-- Content -->
      <template #footer>
        <Button label="Cancel" @click="handleClose" />
        <Button label="Confirm" @click="handleConfirm" />
      </template>
    </form>
  </Dialog>
</template>

<!-- ✅ RÈGLE: Utiliser v-model:visible pas visible props -->
<!-- ✅ RÈGLE: handleClose() pour fermer -->
<!-- ✅ RÈGLE: Try/catch avec toasts sur actions -->
```

### Pattern: Validations Zod avec transform

```ts
// Support héritage legacy + nouveau format
const apiConfigSchema = z
  .object({
    url: z.string().url(),
    method: z.enum(['GET', 'POST', ...]),
    headers: z.array(apiHeaderSchema).optional(),
    headersRaw: z.string().optional(),  // Ancien format
    bodyRaw: z.string(),
    outputPath: z.string().min(1),
  })
  .transform((config) => {
    // Convertir ancien format → nouveau
    const headers = config.headers ?? parseLegacyHeadersRaw(config.headersRaw)
    
    return {
      url: config.url,
      method: config.method,
      headers,
      bodyRaw: config.bodyRaw,
      outputPath: config.outputPath,
    }
  })

// ✅ RÈGLE: Transform pour migrations/normalisations
// ✅ RÈGLE: Tester transform avec ancien et nouveau format
```

---

## 🔄 Patterns d'exécution

### Traversal ordre

```ts
// Traversal par queue + exécution par scope
// Protection anti-boucle via garde-fou global

const queue = [START_ID]
let guard = 0
const MAX_EXECUTION_STEPS = 2000

while (queue.length > 0 && guard < MAX_EXECUTION_STEPS) {
  guard += 1
  const nodeId = queue.shift()
  
  // Execute node, puis pousser les nœuds suivants
  // iterate/subflow déclenchent un scope enfant
}

// ✅ RÈGLE: garder un garde-fou global
// ✅ RÈGLE: respecter les scopes parent/enfant
```

Note importante:
- L'orchestrateur actuel combine exécution par queue + exécution de scopes enfants.
- La sécurité anti-boucle repose sur un garde-fou (`MAX_EXECUTION_STEPS`) et non uniquement sur `visited`.

### Branchement logique

```ts
// Condition: retourne 2 nextNodeIds (true + false)
// Filter: retourne 2 nextNodeIds (filtered + rejected)
// Autres: retourne 0 ou 1 nextNodeIds

function getOutgoingEdges(edges, sourceId) {
  return edges.filter(e => e.source === sourceId)
}

// Condition logic:
if (evaluateCondition(...)) {
  return [getEdgeTarget(edges, 'true')]
} else {
  return [getEdgeTarget(edges, 'false')]
}

function getEdgeTarget(edges, branch) {
  return edges
    .find(e => e.data?.branch === branch)
    ?.target
}

// ✅ RÈGLE: Toujours chercher edges par branch si condition/filter
// ✅ RÈGLE: Return [] si pas edge trouvée (terminal)
```

---

## 🧪 Patterns tests

### Test exécuteur

```ts
import { describe, it, expect } from 'vitest'
import type { PipelineNode } from '@/modules/pipeline/domain/types'

describe('executeApi', () => {
  it('should fetch and store response', async () => {
    // Setup
    const node: PipelineNode = {
      id: 'api1',
      type: 'api',
      position: { x: 0, y: 0 },
      data: {
        type: 'api',
        label: 'Test API',
        config: {
          url: 'https://api.example.com/data',
          method: 'GET',
          headers: [],
          bodyRaw: '',
          outputPath: 'result'
        }
      }
    }
    
    const context = { data: {} }
    const edges = []
    
    // Execute
    const result = executeApi(node, context, edges)
    
    // Assert
    expect(result.success).toBe(true)
    expect(result.context.data.result).toBeDefined()
    expect(result.nextNodeIds.length).toBeGreaterThan(0)
  })
  
  it('should handle validation error', () => {
    // Setup invalid config
    // Execute
    const result = executeApi(invalidNode, context, edges)
    
    // Assert
    expect(result.success).toBe(false)
    expect(result.logs).toContainEqual(
      expect.objectContaining({ level: 'error' })
    )
  })
})

// ✅ RÈGLE: Tester success + error paths
// ✅ RÈGLE: Vérifier context mutation + logs
// ✅ RÈGLE: Tester nextNodeIds routing
```

### Test composant Vue

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InspectorPanel from '@/modules/pipeline/components/InspectorPanel.vue'

describe('InspectorPanel', () => {
  it('should render dialog for selected node', () => {
    // Setup
    const wrapper = mount(InspectorPanel, {
      global: {
        stubs: { Dialog: true, Button: true }
      }
    })
    
    // Assert
    expect(wrapper.find('dialog').exists()).toBe(true)
  })
})

// ✅ RÈGLE: Stub PrimeVue components
// ✅ RÈGLE: Mock store avec vi.mock() si needed
```

---

## 🎨 Patterns UI

### Pattern: Tokens visuels centralises (Iterate/Subflow)

Objectif:
- Eviter les couleurs hardcodees dans les composants.
- Garantir une coherence visuelle entre palette, canvas et console d'execution.
- Faciliter les ajustements de theme en un seul point.

Source unique:
- Les tokens sont definis dans `src/style.css` sous `:root`.

Tokens disponibles:
- Iterate: `--flow-iterate-text`, `--flow-iterate-border`, `--flow-iterate-badge-bg`, `--flow-iterate-button-bg`, `--flow-iterate-button-bg-hover`, `--flow-iterate-button-border`, `--flow-iterate-button-border-hover`, `--flow-iterate-soft`, `--flow-iterate-panel-border`.
- Subflow: `--flow-subflow-text`, `--flow-subflow-border`, `--flow-subflow-badge-bg`, `--flow-subflow-button-bg`, `--flow-subflow-button-bg-hover`, `--flow-subflow-button-border`, `--flow-subflow-button-border-hover`, `--flow-subflow-soft`, `--flow-subflow-panel-border`.

Consommation actuelle:
- `PipelineCanvas.vue`: badges de type conteneur + boutons d'ajout enfant.
- `NodePalette.vue`: accent des cartes Iterate/Subflow + couleur des labels.
- `RunConsole.vue`: bordures des sections conteneur, bordures des niveaux enfants, badges de duree, identifiants de groupe dans les sections conteneur.

Regles:
- Ne pas utiliser de valeur hex/RGB/RGBA en dur pour Iterate/Subflow dans les composants.
- Toujours passer par `var(--flow-...)` pour les couleurs de conteneur.
- En cas de nouvelle surface UI conteneur, ajouter d'abord le token dans `src/style.css`, puis consommer le token dans le composant.
- Pour la console, propager la couleur de conteneur via une variable locale (ex: `--container-info-border`) afin d'aligner les niveaux imbriques.

Checklist rapide avant merge (UI conteneur):
- [ ] Aucun hardcode couleur Iterate/Subflow dans le composant.
- [ ] Les styles utilisent des tokens `--flow-*`.
- [ ] Le rendu est coherent entre `NodePalette`, `PipelineCanvas` et `RunConsole`.
- [ ] Le fallback neutre reste lisible (accent/texte soft) hors contexte conteneur.

### Button styling (PrimeVue)

```vue
<!-- Primary action -->
<Button label="Run" severity="success" @click="handleRun" />

<!-- Secondary action -->
<Button label="Cancel" text @click="handleCancel" />

<!-- Danger action -->
<Button label="Delete" severity="danger" @click="handleDelete" />

<!-- Loading state -->
<Button :loading="isRunning" label="Running..." />
```

### Toast notifications

```ts
import { useToast } from 'primevue/usetoast'

const toast = useToast()

// Success
toast.add({
  severity: 'success',
  summary: 'Pipeline saved',
  life: 3000
})

// Error
toast.add({
  severity: 'error',
  summary: 'Error',
  detail: error.message,
  life: 5000
})

// Info
toast.add({
  severity: 'info',
  summary: 'Pipeline running',
  life: 0  // No auto-close
})
```

### Form validation

```vue
<script setup>
import { ref } from 'vue'
import { apiConfigSchema } from '@/modules/pipeline/domain/schema'

const config = ref(/* ... */)
const errors = ref<Record<string, string>>({})

const handleChange = (field) => {
  errors.value[field] = ''  // Clear previous error
}

const handleSubmit = () => {
  try {
    apiConfigSchema.parse(config.value)
    // Success
  } catch (error) {
    if (error.issues) {
      for (const issue of error.issues) {
        errors.value[issue.path[0]] = issue.message
      }
    }
  }
}
</script>

<template>
  <div>
    <InputText 
      v-model="config.url"
      @change="handleChange('url')"
      :class="{ 'ng-invalid': errors.url }"
    />
    <small v-if="errors.url" class="p-error">{{ errors.url }}</small>
  </div>
</template>
```

---

## 🐛 Patterns debugging

### Logging helpers

```ts
// nodeExecutors.ts
function createLog(
  node: PipelineNode,
  level: ExecutionLog['level'],
  message: string,
  details?: unknown
): ExecutionLog {
  return {
    at: new Date().toISOString(),
    nodeId: node.id,
    nodeType: node.data.type,
    nodeName: node.data.name?.trim() || node.data.label,
    level,
    message,
    details,
  }
}

// Usage:
logs.push(createLog(node, 'info', 'API call successful', snapshotData(context.data)))
logs.push(createLog(node, 'error', 'Validation failed', error))
```

### Snapshot contexte

```ts
// Snapshots données avant/après en logs
function snapshotData(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([key]) => !key.startsWith('__'))  // Ignore internals
  )
}

// Usage en exécuteur:
logs.push(createLog(
  node,
  'info',
  'Input snapshot',
  snapshotData(context.data)
))
```

---

## ✅ Checklists

### Avant merger commit

- [ ] Tests passent: `npm run test`
- [ ] Build succède: `npm run build`
- [ ] Types valides: `vue-tsc -b` (dans build)
- [ ] Pas d'erreurs console au dev
- [ ] Dialogues ferment correctement après action
- [ ] Toasts affichent pour success/error

### Avant ajouter nouveau type nœud

- [ ] Ajouter à types.ts union + interface config
- [ ] Ajouter schéma Zod (schema.ts)
- [ ] Ajouter factory (defaults.ts)
- [ ] Ajouter exécuteur (nodeExecutors.ts)
- [ ] Ajouter dialogue config (InspectorPanel.vue ou dialogs/)
- [ ] Ajouter traductions (messages.json)
- [ ] Ajouter bouton palette (NodePalette.vue)
- [ ] Tester e2e: créer → éditer → exécuter
- [ ] Ajouter tests unitaires exécuteur

### Avant modifier validation

- [ ] Mettre à jour types.ts ET schema.ts en parallèle
- [ ] Tester Zod parse avec valeurs anciennes + nouvelles
- [ ] Si breaking change, ajouter migration dans schema.ts transform
- [ ] Tester composant UI affiche erreurs correctement

---

## 📚 References

- **Vue 3 Composition API**: https://vuejs.org/guide/extras/composition-api-faq.html
- **Pinia**: https://pinia.vuejs.org/
- **PrimeVue**: https://primevue.org/
- **Zod**: https://zod.dev/
- **Vue Flow**: https://vueflow.dev/
- **Vitest**: https://vitest.dev/
