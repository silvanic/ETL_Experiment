# Guide de démarrage rapide par tâche

## 🎯 Avant de commencer

**Lire en priorité:**
1. [ARCHITECTURE.md](./ARCHITECTURE.md) — 10 min pour comprendre l'app
2. [INDEX-FICHIERS.md](./INDEX-FICHIERS.md) — Naviguer les fichiers
3. [PATTERNS-CONVENTIONS.md](./PATTERNS-CONVENTIONS.md) — Conventions et patterns

**Pour l'utilisation de l'interface:**
- [GUIDE-MULTISELECTION.md](./GUIDE-MULTISELECTION.md) — Multi-sélection, raccourcis clavier, opérations (copy/paste/duplicate/delete)

**Fichiers clés toujours accessibles:**
- `src/modules/pipeline/domain/types.ts` — Types données
- `src/modules/pipeline/stores/pipelineEditorStore.ts` — État Pinia

---

## 📋 Par type de tâche

### ❌ Bug à corriger

**Premiers pas:**
1. **Localiser le bug** → est-ce dans:
   - UI (composant Vue) → fichiers `components/*.vue`
   - Validation (données) → `domain/schema.ts` ou `domain/types.ts`
   - Logique exécution → `engine/runPipeline.ts` ou `engine/nodeExecutors.ts`
   - Persistance → `services/pipelineStorage.ts`

2. **Reproduire le bug en test** → `npm run test -- --watch`
   - Pour tests exécution: `engine/nodeExecutors.spec.ts`
   - Pour tests paths: `engine/pathUtils.spec.ts`
   - Pour tests orchestration: `engine/runPipeline.spec.ts`

3. **Debugger au dev** → `npm run dev` + navigateur DevTools
   - Vue DevTools pour inspecter Pinia store
   - Network tab pour requêtes HTTP
   - Console pour logs

4. **Fixer le bug** avec tests verts
5. **Build** → `npm run build` doit réussir sans erreurs

**Fichiers à ouvrir:**
```
🐛 Problème UI                   → src/modules/pipeline/components/*.vue
🐛 Validation données            → src/modules/pipeline/domain/schema.ts
🐛 Exécution pipeline            → src/modules/pipeline/engine/runPipeline.ts
🐛 Logique nœud spécifique       → src/modules/pipeline/engine/nodeExecutors.ts
🐛 localStorage/sauvegarde       → src/modules/pipeline/services/pipelineStorage.ts
🐛 Erreur TypeScript             → vérifier types.ts et schema.ts
```

---

### ✨ Ajouter nouvelle feature

**Première question: Quel type de feature?**

#### A. Ajouter nouveau type de nœud

**Checklist étape par étape:**

1. Planifier config nœud
   - Quel données à configurer?
   - Quel output?
   - Besoin branchement logique?

2. 📝 Mettre à jour `domain/types.ts`
   ```ts
   // Ajouter au NodeType union
   export type NodeType = '...' | 'newType'
   
   // Ajouter interface config
   export interface NewTypeNodeConfig {
     // Vos champs
   }
   ```

3. 📝 Ajouter schéma `domain/schema.ts`
   ```ts
   const newTypeConfigSchema = z.object({
     // Validation Zod
   })
   ```

4. 📝 Ajouter factory `domain/defaults.ts`
   ```ts
   function createNewTypeNode() {
     return createNode('newType', {
       // Default config
     })
   }
   ```

5. 📝 Ajouter exécuteur `engine/nodeExecutors.ts`
   ```ts
   function executeNewType(node, context, edges) {
     // Logique exécution
     return { success, context, nextNodeIds, logs }
   }
   
   // Ajouter à map:
   export const executorByType = {
     // ...
     newType: executeNewType,
   }
   ```

6. 📝 Ajouter tests `engine/nodeExecutors.spec.ts`
   ```ts
   describe('executeNewType', () => {
     it('should...', () => {
       // Test logic
     })
   })
   ```

7. 📝 Ajouter dialogue config `components/InspectorPanel.vue`
   - Ajouter case switch pour 'newType'
   - Créer dialogue config avec champs

8. 📝 Ajouter traductions `i18n/messages.json`
   ```json
   "defaults": {
     "nodes": {
       "newType": "New Type Label"
     }
   }
   ```

9. 📝 Ajouter bouton palette `components/NodePalette.vue`
   - Ajouter bouton draggable pour nouveau type

10. ✅ Tester complet:
    - `npm run test` — tests verts
    - `npm run build` — build succède
    - `npm run dev` — créer nœud, éditer config, exécuter

**Fichiers à modifier:**
```
domain/types.ts                          # 1
domain/schema.ts                         # 2
domain/defaults.ts                       # 3
engine/nodeExecutors.ts                  # 4
engine/nodeExecutors.spec.ts             # 5
components/InspectorPanel.vue            # 6
i18n/messages.json                       # 7
components/NodePalette.vue               # 8
```

#### B. Ajouter champ nouveau à config nœud existant

**Exemple: Ajouter timeout à nœud API**

1. 📝 `domain/types.ts` — Ajouter champ interface
   ```ts
   export interface ApiNodeConfig {
     // ...
     timeout?: number  // Nouveau
   }
   ```

2. 📝 `domain/schema.ts` — Ajouter validation Zod
   ```ts
   const apiConfigSchema = z.object({
     // ...
     timeout: z.number().optional(),
   })
   ```

3. 📝 `domain/defaults.ts` — Ajouter valeur défaut
   ```ts
   config: {
     timeout: 5000,  // Default 5s
   }
   ```

4. 📝 `engine/nodeExecutors.ts` — Utiliser champ
   ```ts
   function executeApi(node, context, edges) {
     const { timeout } = node.data.config
     // Utiliser timeout dans fetch options
   }
   ```

5. 📝 UI component (dialog config pour API)
   - Ajouter champ input pour timeout

6. ✅ Tester avec valeur défaut et personnalisée

**Fichiers à modifier:**
```
domain/types.ts                          # Ajouter champ
domain/schema.ts                         # Ajouter validation
domain/defaults.ts                       # Ajouter défaut
engine/nodeExecutors.ts                  # Utiliser champ
components/InspectorPanel.vue (ou dialog) # UI
```

#### C. Améliorer UI existante

**Exemple: Ajouter filtrage liste DialogPipelineLoad**

1. 📝 Composant `components/dialogs/DialogPipelineLoad.vue`
   ```ts
   const searchQuery = ref('')
   
   const filteredPipelines = computed(() => {
     return pipelines.filter(p =>
       p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
     )
   })
   ```

2. 📝 Template
   ```vue
   <InputText v-model="searchQuery" placeholder="Search..." />
   <DataTable :value="filteredPipelines">
     <!-- Rows -->
   </DataTable>
   ```

3. ✅ Tester au dev: tapez dans input, affichage mise à jour

**Fichiers à modifier:**
```
components/dialogs/DialogPipelineLoad.vue
```

#### D. Améliorer moteur exécution

**Exemple: Ajouter retry automatique pour erreurs réseau**

1. 📝 `engine/nodeExecutors.ts` — executeApi
   ```ts
   async function executeApi(...) {
     const maxRetries = 3
     let lastError
     
     for (let i = 0; i < maxRetries; i++) {
       try {
         // fetch call
         return { success: true, ... }
       } catch (error) {
         lastError = error
         if (i < maxRetries - 1) {
           await sleep(1000 * (i + 1))  // Exponential backoff
         }
       }
     }
     
     return { success: false, ... }
   }
   ```

2. 📝 `engine/nodeExecutors.spec.ts` — Ajouter test retry

3. ✅ Tester: Tuer réseau, pipeline doit retry

**Fichiers à modifier:**
```
engine/nodeExecutors.ts
engine/nodeExecutors.spec.ts
```

---

### 🌍 Ajouter traductions

**Ajouter texte en FR/EN:**

1. 📝 `src/i18n/messages.json`
   ```json
   {
     "components": {
       "newDialog": {
         "title": "My Dialog",
         "description": "Click to confirm"
       }
     }
   }
   ```

2. 📝 Composant Vue
   ```ts
   import { t } from '@/i18n'
   
   const title = t('components.newDialog.title')
   ```

3. ✅ Tester: Changer locale dans app (si UI locale existe)

**Fichiers à modifier:**
```
src/i18n/messages.json           # Ajouter traductions
components/*.vue                 # Utiliser t('key')
```

---

### 🔍 Comprendre fonctionnement existant

**Je veux comprendre comment X fonctionne:**

| Question | Lire ce fichier | Section |
|----------|-----------------|---------|
| Comment exécution pipeline? | `ARCHITECTURE.md` | "Flux d'exécution" |
| Types de nœuds disponibles? | `ARCHITECTURE.md` | "Types de nœuds (10 types)" |
| Structure données pipeline? | `domain/types.ts` | Types principaux |
| Comment validation fonctionne? | `domain/schema.ts` | Schemas Zod |
| Comment state management? | `stores/pipelineEditorStore.ts` | Actions Pinia |
| Comment localStorage? | `services/pipelineStorage.ts` | Fonctions persistance |
| Comment paths JSON? | `engine/pathUtils.ts` | getValueByPath, setValueByPath |
| Comment logs exécution? | `engine/runPipeline.ts` | createLog, snapshots |
| Comment layout UI? | `components/PipelineEditorPage.vue` | Template 3-colonnes |

---

### 🏗️ Architecture & refactoring

**Refactoriser code existant:**

1. **Chercher pattern**: Lire `PATTERNS-CONVENTIONS.md`
   - Patterns exécuteurs
   - Patterns stores Pinia
   - Patterns dialogues Vue
   - Patterns tests

2. **Consulter tests existants** → fichiers `.spec.ts`
   - Voir comment autres code testé
   - Appliquer même pattern

3. **Valider avec build**
   ```bash
   npm run build  # Erreurs TypeScript
   npm run test   # Tests cassés
   npm run dev    # Régression UI
   ```

---

### 📊 Performance & optimisation

**Points de mesure:**

1. **Build time** → `npm run build`, observer output
2. **Bundle size** → Check `dist/` après build
3. **Exec time** → Voir logs RunConsole (timestamps)
4. **Memory** → Browser DevTools Memory tab pendant exécution pipeline

**Optimisations communes:**

| Problème | Solution | Fichier |
|----------|----------|---------|
| Canvas lent avec beaucoup nœuds | Vue Flow virtualization | `PipelineCanvas.vue` |
| Build lent | Check imports, lazy load | `vite.config.ts` |
| Logs énormes | Limiter snapshot taille | `engine/runPipeline.ts` |
| Store slow | Computed memoization | `pipelineEditorStore.ts` |

---

## 🚀 Commandes utiles

```bash
# Développement
npm run dev              # Démarrer Vite dev server
npm run build            # Production build + type check
npm run preview          # Prévisualiser build
npm run test             # Tests Vitest (watch)
npm run test -- file.ts  # Test spécifique

# Build & deploy
npm run build            # Production build (dist/)

# Debug
npm run test -- --ui     # Tests avec UI (Vitest UI)
```

---

## 🎓 Workflow idéal

1. **Lire spec/task** → Comprendre besoin exact
2. **Ouvrir `ARCHITECTURE.md`** → Savoir quels fichiers impliqués
3. **Ouvrir `PATTERNS-CONVENTIONS.md`** → Savoir quel pattern appliquer
4. **Consulter code existant** → Voir exemple du pattern
5. **Écrire tests d'abord** → Avant implémenter (TDD)
6. **Implémenter** → Suivre patterns projet
7. **Tester** → `npm run test`, `npm run build`, `npm run dev`
8. **Commit** → Message clair + référence issue

---

## 📞 Quand demander aide IA

**Fournirez ces infos:**

```
Task: [Description courte]

Fichiers impliqués:
- src/modules/pipeline/.../file.ts
- src/modules/pipeline/.../other.ts

Ce que j'ai essayé:
[Brève explication]

Erreur obtenue:
[Error message complet]

References docs:
- ARCHITECTURE.md: "Flux d'exécution"
- PATTERNS-CONVENTIONS.md: "Pattern X"
```

**L'IA consulteria:**
- Votre contexte de tâche (fichiers impliqués)
- Les patterns du projet dans `PATTERNS-CONVENTIONS.md`
- La mémoire du repo pour comprendre architecture

---

## ✅ Finalisation

Avant de considérer tâche terminée:

- [ ] Tests passent: `npm run test`
- [ ] Build succède: `npm run build`
- [ ] Code suit conventions: `PATTERNS-CONVENTIONS.md`
- [ ] Pas d'errors console
- [ ] Commit message descriptif
