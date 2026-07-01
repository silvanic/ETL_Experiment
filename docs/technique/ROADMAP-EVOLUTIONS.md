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

### Priorisation Recommandee

Objectif: UX/UI d'abord. Maximiser la clarte, la fluidite et la confiance utilisateur, puis consolider le moteur.

#### P1 - Impact fort / Effort modere (prochaines 1-2 semaines)

1. UX Run Console et feedback d'execution
- Historique avec timestamps
- Filtrage par type/noeud
- Export logs (JSON/CSV)
- Valeur: comprendre vite ce qui se passe et corriger sans friction

2. UX Inspector (variables inline + lisibilite)
- Afficher la preview des substitutions avant execution
- Clarifier la valeur resolue vs l expression source
- Valeur: moins d erreurs de configuration et meilleure comprehension des champs

3. UX Canvas et edition
- Meilleure selection/multiselection, alignement et feedback visuel
- Ameliorer la lisibilite des conteneurs Iterate/Subflow
- Valeur: edition de pipelines plus rapide et moins d erreurs de manipulation

#### P2 - Valeur produit / Effort moyen (2-6 semaines)

4. Presets Auth
- Bearer token
- Basic auth
- API key
- Valeur: gain de temps sur la creation de pipelines API

5. Stabilisation moteur via tests cibles
- Ajouter tests cycles, multi-branch et wildcard paths
- Ajouter tests de non-regression Iterate imbrique (contexte global + restoration __currentItem/__currentIndex)
- Valeur: fiabilite pour accompagner la montee en gamme UX

6. Noeud Function (JS local)
- Editeur de code inline (CodeEditorField existant)
- Acces lecture/ecriture aux donnees (`input`) et variables (`getVar`/`setVar`)
- Support `async/await` natif
- Valeur: cas avances non couverts par Transform/Map/Filter sans quitter l'outil

#### P3 - Plus tard (apres stabilisation UX/UI)

6. Condition Block container
- Sous-graphe execute si condition vraie
- Valeur: composition avancee des pipelines une fois l experience de base solide

### Tier 1: ENRICHISSEMENTS + REFACTOS OPTIONNELS

#### 1. **Logging Ameliore**
- Historique avec timestamps
- Filtrage par type/nœud
- Export logs (JSON/CSV)
- 🖥️ **Front-end uniquement** ✅

#### 2. **Variables Inline**
- Déjà partiellement implémenté
- Afficher preview des substitutions en UI
- 🖥️ **Front-end uniquement** ✅

#### 3. **Presets Auth**
- Bearer token
- Basic auth
- API key
- 🖥️ **Front-end uniquement** ✅

---

#### 4. **Refactos Recommandes** (optionnels mais ameliorent la maintenabilite)

| Refacto | Effort | Bénéfice |
|---------|--------|----------|
| Créer classe `ExecutionGraph` pour queries nœuds/arêtes | 1h | Réduit couplage runPipeline ↔ nodeExecutors |
| Extraire classe `PathResolver` (centralise getByPath, resolvePathValue) | 1h | Moins de duplication, easier à tester |
| Changer `NodeType` de string literals en `enum TypeScript` | 30 min | Meilleure ergonomie IDE, moins d'erreurs |
| Unifier patterns exécuteurs (eliminer type guards redondantes) | 1h | Code plus clean |
| Ajouter tests pour cycles + multi-branch + wildcard paths + iterate imbrique | 1h | Assurance qualite avant evolutions moteur |

**Priorité**: Nice-to-have, à faire selon timebox.

---

## ⚠️ Décisions Architecturales

### Q: Quel modèle de contexte pour Iterate ?
**A**: Contexte global partagé en lecture/écriture.
- ✅ Les nœuds enfants Iterate lisent et écrivent dans `context.data` global.
- ✅ Les variables runtime `__currentItem` et `__currentIndex` sont les seules à changer à chaque itération.
- ✅ À la fin d'un Iterate, ces variables runtime sont restaurées pour ne pas polluer le niveau parent.

Ce choix privilégie la simplicité et la compatibilité avec les pipelines existants.

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
  type NodeExecutor = (node: PipelineNode, context: ExecutionContext, graph?: ExecutionGraph, executionState?: ExecutionState) 
                       => Promise<ExecutorResult>
   ```
3. Utiliser `getByPath()` / `setByPath()` pour accéder aux données
4. Retourner `{ nextBranch?, message?, details?, dataOut? }`
5. Logguer via `context.logs.push(createLog(...))`

---

## 🚦 Next Steps

**Phase 1 - UX/UI prioritaire (1-2 semaines)**:
- [x] Logging ameliore (filtres + export)
- [x] Preview variables inline dans l inspecteur
- [x] Ameliorations Canvas (multiselection, alignement, lisibilite)

**Phase 2 - Stabilisation et productivite (2-6 semaines)**:
- [ ] Presets Auth (Bearer, Basic, API key)
- [ ] Tests moteur cibles (cycles, multi-branch, wildcard, iterate imbrique)
- [ ] Noeud Function (execution JS locale via `new Function`, acces `input` + `getVar`/`setVar`)

**Phase 3 - Plus tard**:
- Refactos optionnels (ExecutionGraph, PathResolver)
- Condition Block container
- Logging avance (modes de verbosite, resume vs detail, aggregation des iterations)

---

## 📚 Références

- Architecture: `docs/technique/ARCHITECTURE.md`
- Patterns: `docs/technique/PATTERNS-CONVENTIONS.md`
- Issues/PRs: Tracker dans GitHub (si applicable)
