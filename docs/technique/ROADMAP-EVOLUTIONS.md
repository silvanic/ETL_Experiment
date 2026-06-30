# Roadmap & Évolutions Futures

## 🎯 Vision du Projet

**ETL Experiment** est un outil **front-end de chainement d'API visuel** inspiré d'Insomnia, permettant:
- Exécuter des requêtes API chaînées
- Transformer et filtrer les résultats
- Afficher/visualiser les données récupérées
- Automatiser des workflows simples (auth → API call → process)

**Pas pour**: Remplacer n8n, faire du ETL complexe, du scheduling avancé, du multi-utilisateurs.

---

## 🏗️ Architecture Actuelle

### Contexte Partagé Global
```typescript
context.data = {
  result: {...},        // Données actuelles
  __variables: {...},   // Variables globales
  __output: {...}       // Sortie finale
}
```

### Avantages
✅ Simple et transparent  
✅ Facile de croiser des données (une branche peut lire ce qu'une autre a écrit)  
✅ Pas de duplication mémoire  

### Limites Connues
❌ Iterate imbriqué ne fonctionne pas (multi-branche crée des collisions)  
❌ Multi-Filter complexe (même problème)  
❌ Pas de vrai contexte par "chemin d'exécution"  

### Pourquoi on la garde
- Suffisante pour 90% du use-case (API → Transform → Display)
- Refactoriser vers un modèle n8n (contexte par item) = grosse refonte
- Trade-off: simplicité vs features avancées

---

## 📋 Priorités de Développement

### Phase Préalable: REFACTORING (P0 - BLOQUANT pour Iterate)

**Pourquoi?** Ces changements sont nécessaires pour supporter les Nested Nodes sans refonte complète après.

#### 1. **Ajouter `parentId` à `PipelineNode`** (P0 - 30 min)

**Fichier**: `src/modules/pipeline/domain/types.ts`

```typescript
export interface PipelineNode<T extends NodeType = NodeType> {
  id: string
  type: string
  position: { x: number; y: number }
  data: PipelineNodeData<T>
  parentId?: string  // ← NEW: Référence au container parent
  draggable?: boolean
  sourcePosition?: Position
  targetPosition?: Position
}
```

**Pourquoi**: Sans ça, impossible de tracer la hiérarchie parent → enfant dans `runPipeline.ts`.

---

#### 2. **Étendre `ExecutorResult` pour Container/Iterate** (P0 - 30 min)

**Fichier**: `src/modules/pipeline/engine/executorTypes.ts`

```typescript
export type ExecutorResult = {
  nextBranch?: 'true' | 'false'
  details?: unknown
  message?: string
  dataOut?: unknown
  
  // ← NEW: Nécessaire pour nœuds container
  childrenNodeIds?: string[]  // Pour container: nœuds à exécuter après
  exitMode?: 'next' | 'break' | 'continue'  // Pour iterate: contrôle de flux
  scopedData?: Record<string, unknown>  // Données à passer au sous-graphe
}
```

**Pourquoi**: Les exécuteurs de container doivent pouvoir signaler "exécute ces enfants avec ce contexte".

---

#### 3. **Refactoriser signature `NodeExecutor`** (P0 - 2h)

**Fichier**: `src/modules/pipeline/engine/executorTypes.ts`

**Avant**:
```typescript
type NodeExecutor = (node: PipelineNode, context: ExecutionContext) 
  => Promise<ExecutorResult>
```

**Après**:
```typescript
type NodeExecutor = (
  node: PipelineNode, 
  context: ExecutionContext,
  graph: { nodes: PipelineNode[], edges: PipelineEdge[] },
  executionState: ExecutionState
) => Promise<ExecutorResult>

// Nouveau type pour le state
export interface ExecutionState {
  currentPath: string[]  // [root, parent, current] nœud IDs
  currentNodeId: string
  parentNodeId?: string
}
```

**Impact**: 
- Todos les exécuteurs dans `nodeExecutors.ts` doivent être mis à jour (ajout params)
- `runPipeline.ts` passe maintenant `graph` et `executionState` aux exécuteurs
- Les nœuds container (Iterate) peuvent maintenant accéder à leurs enfants

**Fichiers à modifier**:
- `src/modules/pipeline/engine/executorTypes.ts` (types)
- `src/modules/pipeline/engine/nodeExecutors.ts` (tous les exécuteurs)
- `src/modules/pipeline/engine/runPipeline.ts` (appels aux exécuteurs)

---

#### 4. **Ajouter `ExecutionStack` à `ExecutionContext`** (P0 - 45 min)

**Fichier**: `src/modules/pipeline/domain/types.ts`

```typescript
export interface ExecutionContext {
  data: Record<string, unknown>  // Données globales partagées
  logs: ExecutionLog[]
  
  // ← NEW: Stack pour isoler contextes imbriqués
  executionStack: Array<{
    nodeId: string
    parentNodeId?: string
    enterTime: number
    scopedData?: Record<string, unknown>  // Données locales au nœud
  }>
}
```

**Pourquoi**: Quand un Iterate exécute ses enfants, les variables `__currentItem` du niveau enfant ne doivent pas polluer le contexte parent.

---

### Tier 1: ITERATE via Vue Flow Nested Nodes (après refactos P0)

#### 1. **Iterate via Vue Flow Nested Nodes**
**Cas d'usage**:
```
API: GET /users → [alice, bob, charlie]
      ↓
┌─────────────────────────────┐
│  🔁 ITERATE (users)         │
│  ┌──────┐    ┌──────────┐   │
│  │ API  │ →  │Transform │   │
│  └──────┘    └──────────┘   │
└─────────────────────────────┘
```

**Approche choisie: Vue Flow Nested Nodes** (container parent/enfant)
- L'Iterate est un nœud **container** visuel
- Les nœuds à l'intérieur = le corps de la boucle (enfants via `parentId`)
- Le moteur détecte les nœuds racine (`!node.parentId`) et les nœuds enfants
- L'exécuteur Iterate exécute le sous-graphe N fois avec **contexte isolé par item**

**Pourquoi cette approche plutôt que l'Iterate simple**:
- ✅ Visuel évident: l'utilisateur voit clairement ce qui boucle
- ✅ Iterate imbriqué fonctionne naturellement (container dans container)
- ✅ Débloque d'autres features gratuitement (Try/Catch, Condition Block, Sub-pipeline)
- ✅ Non-breaking: les pipelines existants n'ont pas de `parentId`, ils continuent de fonctionner

**Mécanique d'exécution**:
```typescript
// runPipeline.ts: ne traiter que les nœuds racine
const rootNodes = definition.nodes.filter(n => !n.parentId)
const queue = [findStartNode(rootNodes)]

// iterateExecutor: exécute le sous-graphe pour chaque item
const subNodes = definition.nodes.filter(n => n.parentId === node.id)
const subEdges = definition.edges.filter(e => subNodes.some(n => n.id === e.source || n.id === e.target))

for (const item of items) {
  const itemContext = deepClone(context)
  itemContext.data.__currentItem = item
  const subResult = await runSubPipeline(subNodes, subEdges, itemContext)
  results.push(subResult)
}
// Fusionner les résultats dans context.data parent
setByPath(context.data, outputPath, results)
```

**Features débloquées par la même mécanique**:
| Feature | Comment |
|---------|--------|
| **Iterate** | Sous-graphe exécuté N fois |
| **Try/Catch** | Sous-graphe avec branche erreur |
| **Condition Block** | Sous-graphe si condition vraie |
| **Sub-pipeline** | Sous-graphe = pipeline externe |
| **Groupe visuel** | Container cosmétique |

**Fichiers à modifier** (après refactos P0):
- `src/modules/pipeline/domain/types.ts` → `parentId` déjà présent
- `src/modules/pipeline/domain/schema.ts` → Zod schema pour iterate
- `src/modules/pipeline/engine/nodeExecutors.ts` → `iterateExecutor` (utilise nouveau signature)
- `src/modules/pipeline/engine/runPipeline.ts` → utilise `parentId` pour filtrer nœuds racine
- `src/modules/pipeline/components/PipelineCanvas.vue` → support Vue Flow parent/enfant
- `src/modules/pipeline/components/RunConsole.vue` → traduction du type
- `src/i18n/messages.json` → labels iterate

**Complexité**: Moyenne (~1-2 jours) **+ 3-4h refactos P0 avant**  
**Timeline Total**: 2-3 jours

**Point d'entrée du sous-graphe**:  
Chaque container requiert un nœud `start` interne (même type que le `start` racine, scopé au container).  
C'est cohérent avec l'existant et sans ambiguïté - l'utilisateur pose toujours un Start à l'intérieur.
```
┌──────────────────────────────────┐
│  🔁 ITERATE (users)              │
│  [▶ Start] → [API] → [Transform] │
└──────────────────────────────────┘
```
`findStartNode()` existant fonctionne tel quel sur les `subNodes`. ✅

**Variables dynamiques dans les nœuds enfants**: `${__currentItem.id}`, `${__currentItem.name}`

---

#### 2. **Error Handling & Retry**
**Cas d'usage**:
```
API call timeout → Retry 3x → Si fail: goto nœud "on-error"
```

**Approche**:
- Ajouter `ApiNodeConfig.retryConfig: { maxRetries, delayMs }`
- Wrapper `fetch()` avec retry logic
- Créer nœud "error-handler" ou laisser utilisateur brancher manuellement

**Fichiers à modifier**:
- `src/modules/pipeline/domain/types.ts`
- `src/modules/pipeline/engine/nodeExecutors.ts` → apiExecutor

**Complexité**: Moyenne (100 lignes)  
**Timeline**: 2-3h

---

### Tier 2: ENRICHISSEMENTS + REFACTOS OPTIONNELS (après Tier 1)

#### 3. **Logging Amélioré**
- Historique avec timestamps
- Filtrage par type/nœud
- Export logs (JSON/CSV)
- 🖥️ **Front-end uniquement** ✅

#### 4. **Variables Inline**
- Déjà partiellement implémenté
- Afficher preview des substitutions en UI
- 🖥️ **Front-end uniquement** ✅

#### 5. **Presets Auth**
- Bearer token
- Basic auth
- API key
- OAuth (complexe, mais possible en front)
- 🖥️ **Front-end uniquement** ✅

---

#### 6. **Refactos Recommandés** (optionnels mais améliorent maintenabilité)

| Refacto | Effort | Bénéfice |
|---------|--------|----------|
| Créer classe `ExecutionGraph` pour queries nœuds/arêtes | 1h | Réduit couplage runPipeline ↔ nodeExecutors |
| Extraire classe `PathResolver` (centralise getByPath, resolvePathValue) | 1h | Moins de duplication, easier à tester |
| Changer `NodeType` de string literals en `enum TypeScript` | 30 min | Meilleure ergonomie IDE, moins d'erreurs |
| Unifier patterns exécuteurs (eliminer type guards redondantes) | 1h | Code plus clean |
| Ajouter tests pour cycles + multi-branch + wildcard paths | 1h | Assurance qualité avant refactor majeur |

**Priorité**: Nice-to-have, peut être fait après Iterate si timeboxé.

---

### Tier 3: FUTUR (réaliste + 6 mois)

#### 6. **Sub-pipelines**
- Appeler un pipeline depuis un autre
- Réutilisabilité
- 🖥️ **Front-end uniquement** ✅

#### 7. **Concurrence Basique**
- Quelques nœuds en parallèle (pas tout)
- 🖥️ **Front-end uniquement** ✅ (Promise.all + gestion de contextes)
- Attention: complexité 📈📈

---

## ⚠️ Décisions Architecturales

### Q: Pourquoi Nested Nodes pour Iterate plutôt qu'un Iterate simple?
**A**: L'Iterate simple (boucle interne, sans UI container) est plus rapide à faire (~70 lignes) mais :
- ❌ Iterate imbriqué impossible (collisions de données dans context.data)
- ❌ N'ouvre aucune autre feature
- ❌ Moins lisible visuellement

Les Nested Nodes coûtent ~1-2 jours mais débloquent **une mécanique générique** réutilisable pour Try/Catch, Condition Block, Sub-pipeline, etc. C'est le bon investissement.

---

### Q: Les Nested Nodes cassent-ils les pipelines existants?
**A**: Non. La modification est non-breaking:
- Nœuds existants n'ont pas de `parentId` → traités comme avant par le BFS
- Seule modification: `runPipeline.ts` filtre `nodes.filter(n => !n.parentId)` pour la queue racine
- Les nœuds enfants (`parentId` défini) sont ignorés par le BFS principal, gérés uniquement par leur container

---

### Q: Iterate imbriqué fonctionne-t-il avec les Nested Nodes?
**A**: Oui, naturellement. Chaque container exécute son sous-graphe avec un **contexte cloné et isolé**. Pas de collision possible.
```
┌─────────────────────────────┐
│  🔁 ITERATE (users)         │
│  ┌────────────────────────┐ │
│  │  🔁 ITERATE (orders)   │ │  ← Fonctionne ✅
│  └────────────────────────┘ │
└─────────────────────────────┘
```

---

### ⚠️ Important: Impact des Refactos P0

**Les changements de Phase 0 sont critiques mais impactants**:
- `parentId` ajouté à `PipelineNode` → aucun impact (champ optionnel) ✅
- Signature `NodeExecutor` change: `(node, context)` → `(node, context, graph, state)`
  - ✅ Donne accès au graphe complet et à l'exécution
  - ⚠️ **Tous les exécuteurs typés dans `nodeExecutors.ts` doivent être mis à jour** (pas complexe, mise à jour mécanique des signatures)
  - ⚠️ `runPipeline.ts` doit passer les nouveaux paramètres (refacto clé, voir section Phase Préalable)

**Stratégie pour contenir l'impact**:
1. Créer une branche `refactor/nested-nodes-prep`
2. Faire les 4 changements P0 ensemble (types + signature)
3. Adapter les exécuteurs (passe rapide: ajouter params, même corps)
4. Adapter runPipeline (revoir la queue + passage params)
5. Tests exhaustifs avant merge (vérifier que rien ne se casse)
6. Directement suivi par Phase 1 (Iterate) dans la même branche

**Bénéfice**: Après P0, ajouter Try/Catch, Condition Block ou Sub-pipeline sera trivial (réutilisent la même mécanique)

---

### Q: Comment intégrer nouvelles features?

**Checklist pour chaque nœud**:
1. ✅ Ajouter type à `NodeType` enum
2. ✅ Créer `XxxNodeConfig` interface
3. ✅ Ajouter Zod schema
4. ✅ Écrire `xxxExecutor` dans `nodeExecutors.ts`
5. ✅ Exporter dans `executorByType` map
6. ✅ Traduction dans `RunConsole.vue` → `translatedNodeType()`
7. ✅ Tests (optional mais recommandé)
8. ✅ Update README/help docs

**Exemple minimal**: `filter` node (~200 lignes réparties)

---

## 🔍 Fichiers Clés à Connaître

| Fichier | Rôle |
|---------|------|
| `domain/types.ts` | Types pipeline (énums, interfaces) |
| `domain/schema.ts` | Validation Zod + transformations |
| `engine/nodeExecutors.ts` | Exécution de chaque type de nœud |
| `engine/runPipeline.ts` | Orchestration globale (BFS queue) |
| `engine/pathUtils.ts` | `getByPath(obj, "a.b[0].c")` |
| `services/pipelineStorage.ts` | Persistence localStorage |
| `stores/pipelineEditorStore.ts` | État Pinia |
| `components/RunConsole.vue` | Affichage logs |

---

## 📝 Tests & Validation

### Avant de merger une feature:
1. ✅ Tests unitaires (`*.spec.ts`)
2. ✅ Tests manuels sur UI
3. ✅ Cas limites (empty arrays, null values, etc.)
4. ✅ Logs clairs pour debug

### Commandes:
```bash
npm run test           # Jest tests
npm run build          # Build production
npm run dev            # Dev server + hot reload
```

---

## 🎓 Apprentissage Architecture

**Pour bien coder une nouvelle feature**:

1. Regarder un exécuteur existant (`filterExecutor`, `apiExecutor`)
2. Respecter l'interface `NodeExecutor`:
   ```ts
   type NodeExecutor = (node: PipelineNode, context: ExecutionContext) 
                       => Promise<ExecutorResult>
   ```
3. Utiliser `getByPath()` / `setByPath()` pour accéder aux données
4. Retourner `{ nextBranch?, message?, details?, dataOut? }`
5. Logguer via `context.logs.push(createLog(...))`

---

## 🚦 Next Steps

**Phase 0: Refactoring Préalable** (3-4h total - faire d'abord):
- [ ] Ajouter `parentId` à PipelineNode
- [ ] Étendre ExecutorResult (childrenNodeIds, exitMode, scopedData)
- [ ] Refactoriser signature NodeExecutor (ajouter graph + executionState)
- [ ] Ajouter ExecutionStack à ExecutionContext
- [ ] Tests: vérifier que rien n'est cassé

**Phase 1: Iterate Nested Nodes** (1-2 jours - après Phase 0):
- [ ] Implémenter iterateExecutor
- [ ] Support Vue Flow parent/enfant
- [ ] Tests Iterate simple + imbriqué
- [ ] Docs utilisateur + help

**Phase 2: Retry Logic** (2-3h - indépendant):
- [ ] Ajouter retryConfig à ApiNodeConfig
- [ ] Wrap fetch() avec retry logic
- [ ] Tests retry + timeout

**Phase 3: Enrichissements** (après Phase 1):
- [ ] Logging amélioré
- [ ] Variables inline UI preview
- [ ] Auth presets
- [ ] Try/Catch container (réutilise mécanique Nested Nodes)
- [ ] Sub-pipelines (réutilise mécanique Nested Nodes)

**Phase 4+: Futur** (6+ mois):
- Refactos optionnels (ExecutionGraph, PathResolver)
- Condition Block container
- Concurrence basique

---

## 📚 Références

- Architecture: `docs/technique/ARCHITECTURE.md`
- Patterns: `docs/technique/PATTERNS-CONVENTIONS.md`
- Issues/PRs: Tracker dans GitHub (si applicable)
