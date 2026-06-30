# Guide Multi-Sélection et Contrôles

## 🎯 Vue d'ensemble

Le système de multi-sélection permet de gérer efficacement plusieurs nœuds à la fois avec:
- **Sélection au clavier** (Ctrl+Click, Shift+Click, Ctrl+A)
- **Contrôles d'édition** (Copy, Cut, Paste, Duplicate, Delete)
- **Raccourcis clavier** pour toutes les actions

---

## 🖱️ Sélection des nœuds

### Sélection simple (Clic)
Clic sur un nœud → **sélection unique** (désélectionne les autres)

### Toggler la sélection (Ctrl/Cmd + Clic)
Maintiens **Ctrl** (Windows/Linux) ou **Cmd** (Mac) et clique sur un nœud pour **ajouter/retirer** de la sélection

```
Ctrl+Clic sur A → A sélectionné
Ctrl+Clic sur B → A et B sélectionnés
Ctrl+Clic sur A → B sélectionné (A retiré)
```

### Ajouter à la sélection (Shift + Clic)
Maintiens **Shift** et clique pour **ajouter à la sélection** (contrairement à Ctrl+Clic qui bascule)

```
Clic sur A → A sélectionné
Shift+Clic sur B → A et B sélectionnés
Shift+Clic sur C → A, B et C sélectionnés
```

### Sélectionner tous (Ctrl/Cmd + A)
**Ctrl+A** (Windows/Linux) ou **Cmd+A** (Mac) → **sélectionne tous les nœuds** du canvas

### Désélectionner
Clic sur le **canvas vide** ou une **edge** → **désélectionne tout**

---

## 📋 Opérations sur nœuds sélectionnés

### Copier (Ctrl/Cmd + C)
**Raccourci:** `Ctrl+C` / `Cmd+C`  
**Bouton:** 📋 Copy (apparaît avec ≥1 nœud sélectionné)

Copie les nœuds **et leurs connexions internes** vers le presse-papiers.

**Exemple:**
```
Sélectionne A → B (avec edge A→B)
Ctrl+C → presse-papiers = [A, B] + edge A→B
```

### Coller (Ctrl/Cmd + V)
**Raccourci:** `Ctrl+V` / `Cmd+V`  
**Bouton:** 📌 Paste (apparaît si le presse-papiers a du contenu)

Colle les nœuds depuis le presse-papiers à une **position décalée** (+40px par nœud) et **préserve les connexions**.

**Exemple:**
```
Presse-papiers: [A, B] avec edge A→B
Ctrl+V → crée [A', B'] décalés + edge A'→B'
```

**Cas spécial:** Après un **Cut**, les nœuds n'existent plus dans le canvas, donc le Paste crée une version "restaurée".

### Couper (Ctrl/Cmd + X)
**Raccourci:** `Ctrl+X` / `Cmd+X`  
**Bouton:** ✂️ Cut (apparaît avec ≥1 nœud sélectionné)

Combine **Copier + Supprimer**:
1. Copie les nœuds vers le presse-papiers (avec leurs edges)
2. **Supprime** les nœuds du canvas et leurs edges

**Exemple workflow:**
```
Clic sur A → Ctrl+X (A copié et supprimé)
Clic sur canvas vide
Ctrl+V → A réapparaît à position décalée
```

### Dupliquer (Ctrl/Cmd + D)
**Raccourci:** `Ctrl+D` / `Cmd+D`  
**Bouton:** 🔁 Duplicate (apparaît avec ≥1 nœud sélectionné)

Crée **une copie immédiate** des nœuds sélectionnés:
- Position décalée (+40px)
- Connexions internes préservées
- **Rester dans le canvas** (pas de presse-papiers)

**Différence avec Copy+Paste:**
- Duplicate: 1 action, crée copie immédiate
- Copy+Paste: 2 actions, utilise presse-papiers, peut être utilisé ailleurs

### Supprimer (Delete ou Ctrl/Cmd + Suppr)
**Raccourci:** `Delete` ou `Ctrl+Delete`  
**Bouton:** 🗑️ Delete (apparaît avec ≥1 nœud sélectionné)

Supprime tous les nœuds sélectionnés **et toutes leurs edges** associées.

```
Sélectionne A, B, C (avec edges)
Delete → A, B, C et toutes leurs edges supprimées
```

---

## 🎮 Contrôles interface (Vue Flow Controls)

Les 6 boutons en haut à gauche du canvas:

| Bouton | Icône | Condition d'affichage | Action |
|--------|-------|----------------------|--------|
| **Play** | ▶️ | Toujours | Exécute le pipeline |
| **Copy** | 📋 | 1+ nœud sélectionné | Copie vers presse-papiers |
| **Paste** | 📌 | Presse-papiers non-vide | Colle nœuds |
| **Cut** | ✂️ | 1+ nœud sélectionné | Coupe vers presse-papiers |
| **Duplicate** | 🔁 | 1+ nœud sélectionné | Duplique dans le canvas |
| **Delete** | 🗑️ | 1+ nœud sélectionné | Supprime nœuds |

### Notifications (Toast)
Chaque opération affiche une notification:
- ✅ **Copié** (2.5s) — Bleu
- ✅ **Collé** (2.5s) — Vert
- ✅ **Dupliqué** (2.5s) — Vert
- ⚠️ **Supprimé** (2.5s) — Orange

---

## 🔒 Comportement des edges (connexions)

### Lors du Copy
Seules les edges **entre les nœuds copiés** sont copiées.

```
Nœuds: A → B → C
Copie seulement A et B

Résultat: A → B (edge conservée)
          C n'est pas dans le presse-papiers
```

### Lors du Paste
Les edges sont **remappées** avec les IDs des nouveaux nœuds.

```
Presse-papiers: A → B
A.id = "uuid-1", B.id = "uuid-2", edge source=uuid-1 target=uuid-2

Paste crée:
A'.id = "uuid-new-1", B'.id = "uuid-new-2"
edge remappée: source=uuid-new-1 target=uuid-new-2
```

### Lors du Duplicate
Même comportement que Paste (edges internes remappées).

### Lors du Delete
Toutes les edges **vers/depuis** les nœuds supprimés sont supprimées.

```
Nœuds: A → B ← C
Delete B → supprime A→B et C→B
```

---

## 📊 État interne (Architecture)

### Store Pinia (`pipelineEditorStore.ts`)

**Sélection:**
```ts
const selectedNodeIds = ref<Set<string>>(new Set())  // O(1) lookups
```

**Presse-papiers:**
```ts
const clipboard = ref<{
  nodes: PipelineNode[]
  edges: PipelineEdge[]
}>({ nodes: [], edges: [] })
```

### Computed Properties

```ts
const selectedNodes = computed(() =>
  nodes.value.filter(n => selectedNodeIds.value.has(n.id))
)

const selectedNode = computed(() =>
  nodes.value.find(n => selectedNodeIds.value.has(n.id))
)
```

### Actions Store

```ts
// Sélection
function setSelectedNode(nodeId: string | null)
function toggleSelectNode(nodeId: string)
function addToSelection(nodeId: string)
function removeFromSelection(nodeId: string)
function selectAllNodes()
function clearSelection()

// Édition
function copySelectedNodes()
function pasteNodes()
function cutSelectedNodes()  // = copy + delete
function duplicateSelectedNodes()
function deleteSelectedNodes()
```

---

## 🐛 Dépannage

### Le bouton n'apparaît pas
**Copy/Cut/Duplicate/Delete ne s'affichent pas?**
- Vérifier: `selectedNodeIds.size > 0` dans le store
- Sélectionner un nœud et vérifier Vue DevTools

**Paste ne s'affiche pas?**
- Vérifier: `clipboard.nodes.length > 0`
- Faire un Ctrl+C d'abord

### Les edges disparaissent au Paste
✅ **RÉSOLU:** Les edges sont maintenant stockées dans le clipboard avec les nœuds et remappées correctement.

### Raccourci clavier ne fonctionne pas
- Vérifier la touche de modification: `Ctrl` sur Windows/Linux, `Cmd` sur Mac
- Vérifier que le focus est sur le canvas Vue Flow
- Logs: ouvrir DevTools, chercher "Keyboard" dans console

---

## 💡 Cas d'usage courants

### 1. Dupliquer un pipeline pattern
```
1. Sélectionne les nœuds du pattern (Ctrl+Clic sur chacun)
2. Ctrl+D pour dupliquer
3. Déplace le groupe dupliqué ailleurs
```

### 2. Copier entre deux pipelines
```
Pipeline 1:
1. Sélectionne nœuds → Ctrl+C

Pipeline 2 (ouvrir dans nouvel onglet):
2. Ctrl+V pour coller les nœuds
```

### 3. Tester et annuler
```
1. Sélectionne nœuds
2. Ctrl+X pour couper (sécurisé)
3. Fais modifications
4. Ctrl+V pour restaurer
```

### 4. Nettoyer des nœuds orphelins
```
1. Ctrl+A pour sélectionner tous
2. Clic sur un nœud à garder (Ctrl+Clic pour toggle)
3. Delete les autres
```

---

## 📝 Fichiers clés

```
src/modules/pipeline/components/PipelineCanvas.vue
├─ Gestion événements clavier (onKeyDown)
├─ Gestion clics nœuds (onNodeClick)
├─ Contrôles UI (ControlButton + MdiIcon)

src/modules/pipeline/stores/pipelineEditorStore.ts
├─ selectedNodeIds Set<string>
├─ clipboard { nodes, edges }
├─ copySelectedNodes()
├─ pasteNodes()
├─ cutSelectedNodes()
├─ duplicateSelectedNodes()
├─ deleteSelectedNodes()

src/components/MdiIcon.vue
├─ Wrapper Material Design Icons

src/i18n/messages.json
└─ Traductions des toast et tooltips
```

---

## 🚀 Améliorations futures possibles

- [ ] Boîte de sélection (drag pour sélectionner plusieurs nœuds)
- [ ] Groupement de nœuds (créer macro/sous-groupe)
- [ ] Historique Undo/Redo (pour Copy/Paste/Delete)
- [ ] Glisser-déposer pour groupes sélectionnés
- [ ] Aligner/Distribuer les nœuds sélectionnés
