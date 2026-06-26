# 📚 Documentation Technique - ETL Experiment

Bienvenue! Cette section contient toute la documentation technique pour comprendre et développer ETL Experiment.

## 🚀 Commencer

**Nouveau sur le projet? Lisez dans cet ordre:**

1. **[GUIDE-DEMARRAGE.md](./GUIDE-DEMARRAGE.md)** ← **À LIRE EN PREMIER** ✨
   - Checklist par type de tâche (bug, feature, etc.)
   - Points d'entrée rapides
   - Commandes utiles

2. **[ARCHITECTURE.md](./ARCHITECTURE.md)**
   - Vue d'ensemble complète de l'application
   - Types de données principaux
   - Types de nœuds disponibles (8 types)
   - Flux d'exécution pipeline
   - Pinia store et services

3. **[INDEX-FICHIERS.md](./INDEX-FICHIERS.md)**
   - Structure complète du projet avec annotations
   - Rôle de chaque fichier
   - Workflows (ajouter nœud, modifier config, debug)
   - Tailles fichiers

4. **[PATTERNS-CONVENTIONS.md](./PATTERNS-CONVENTIONS.md)**
   - Conventions de nommage
   - Patterns d'architecture (validation, exécuteurs, stores)
   - Patterns d'exécution (traversal, branchement)
   - Patterns tests et UI
   - Checklists avant commit

---

## 📖 Documents détaillés

### Architecture & Design

| Document | Contenu | Durée lecture |
|----------|---------|---------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Stack technique, structure modules, types données, types nœuds, flux exécution, stores, services, moteur | 20 min |
| [INDEX-FICHIERS.md](./INDEX-FICHIERS.md) | Rôle chaque fichier, workflows par tâche, tailles fichiers, premiers pas | 15 min |

### Development

| Document | Contenu | Durée lecture |
|----------|---------|---------------|
| [PATTERNS-CONVENTIONS.md](./PATTERNS-CONVENTIONS.md) | Conventions, patterns code, patterns tests, patterns UI, checklists | 15 min |
| [GUIDE-DEMARRAGE.md](./GUIDE-DEMARRAGE.md) | Par type tâche (bug, feature), commandes, workflow idéal | 10 min |

### User Guides

| Document | Contenu | Durée lecture |
|----------|---------|---------------|
| [GUIDE-MULTISELECTION.md](./GUIDE-MULTISELECTION.md) | Multi-sélection nœuds, raccourcis clavier, opérations (copy/paste/cut/duplicate/delete), gestion edges, cas d'usage | 8 min |

### Historical

| Document | Contenu |
|----------|---------|
| [plan-migration-primevue.md](./plan-migration-primevue.md) | Plan historique migration vers PrimeVue 4 |

---

## 🎯 Par type de tâche

### 🐛 Je dois corriger un bug

👉 Lire: [GUIDE-DEMARRAGE.md → ❌ Bug à corriger](./GUIDE-DEMARRAGE.md#-bug-à-corriger)

**Résumé**: Localiser bug dans composant/validation/moteur → reproduire en test → fixer → vérifier build

### ✨ Je dois ajouter une feature

👉 Lire: [GUIDE-DEMARRAGE.md → ✨ Ajouter feature](./GUIDE-DEMARRAGE.md#-ajouter-nouvelle-feature)

**Types de features:**
- **Nouveau type nœud** → [Checklist complète](./GUIDE-DEMARRAGE.md#a-ajouter-nouveau-type-de-nœud)
- **Champ nouveau dans config** → [Checkliste rapide](./GUIDE-DEMARRAGE.md#b-ajouter-champ-nouveau-à-config-nœud-existant)
- **Amélioration UI** → [Patterns Vue](./PATTERNS-CONVENTIONS.md#-patterns-ui)
- **Amélioration moteur** → [Patterns exécuteurs](./PATTERNS-CONVENTIONS.md#pattern-exécuteurs-typés)

### 🌍 Je veux ajouter traductions

👉 Lire: [GUIDE-DEMARRAGE.md → 🌍 Ajouter traductions](./GUIDE-DEMARRAGE.md#-ajouter-traductions)

**Fichier:** `src/i18n/messages.json`

### 🔍 Je veux comprendre comment X fonctionne

👉 Consulter le tableau dans [GUIDE-DEMARRAGE.md → 🔍 Comprendre existant](./GUIDE-DEMARRAGE.md#-comprendre-fonctionnement-existant)

### 🏗️ Je veux refactoriser / optimiser

👉 Lire: [PATTERNS-CONVENTIONS.md](./PATTERNS-CONVENTIONS.md) puis [GUIDE-DEMARRAGE.md → Refactoring](./GUIDE-DEMARRAGE.md#-architecture--refactoring)

---

## 🔑 Concepts clés

### Types de nœuds disponibles

L'app supporte **8 types de nœuds** dans un pipeline:

| Type | Rôle | Config principal |
|------|------|-----------------|
| **start** | Démarrage | Note optionnelle |
| **api** | Requête HTTP | URL, méthode, headers, body |
| **setVariable** | Extraire variables | Extractions path → variable name |
| **condition** | Branchement logique (2 voies) | Condition (left/op/right) |
| **filter** | Filtrer array (2 voies) | Array source, item condition |
| **transform** | Transformation données | Pick ou assign literal |
| **map** | Mapping tableau | Source array + mappings template |
| **output** | Résultat final | Path à extraire |

👉 Détails: [ARCHITECTURE.md → Types de nœuds](./ARCHITECTURE.md#types-de-nœuds-8-types)

### Architecture en couches

```
UI Layer (Vue 3 Components)
    ↓
State Layer (Pinia Store)
    ↓
Execution Layer (nodeExecutors, runPipeline)
    ↓
Domain Layer (types, schemas, validators)
    ↓
Services Layer (localStorage, path utils)
```

👉 Détails: [ARCHITECTURE.md → Stack technique](./ARCHITECTURE.md#stack-technique)

### Flux d'exécution

1. Pipeline déclenché → Valide schéma
2. Initialise ExecutionContext vide
3. **Boucle BFS**: queue de nœuds à exécuter
   - Exécute nœud avec exécuteur typé
   - Logs et snapshot contexte
   - Ajoute nœuds suivants à queue
4. Retourne ExecutionRun avec logs + résultat

👉 Détails: [ARCHITECTURE.md → Flux d'exécution](./ARCHITECTURE.md#flux-dexécution-du-pipeline)

---

## 🛠️ Outils & Commandes

```bash
# 🚀 Développement
npm run dev              # Démarrer dev server Vite
npm run test             # Tests Vitest (watch mode)
npm run test -- file.ts  # Test spécifique

# 🏗️ Production
npm run build            # Build + type check + bundle
npm run preview          # Prévisualiser build

# 🐛 Debugging
npm run test -- --ui     # Tests avec UI interactive
```

---

## 📂 Structure fichiers importants

```
src/
├── modules/pipeline/
│   ├── domain/           ← Types, schémas, constantes
│   ├── engine/           ← Moteur exécution
│   ├── stores/           ← Pinia store
│   ├── services/         ← Persistance localStorage
│   └── components/       ← Vue composants
└── i18n/                 ← Traductions

docs/technique/          ← Vous êtes ici
├── ARCHITECTURE.md      ← Vue complète
├── INDEX-FICHIERS.md    ← Navigation
├── PATTERNS-CONVENTIONS.md ← Patterns code
└── GUIDE-DEMARRAGE.md   ← Par type tâche
```

---

## 💡 Patterns essentiels

Avant de coder:

1. **Validation en couches** — TypeScript types → Zod schema → Composant
2. **Exécuteurs typés** — Chaque type nœud = fonction avec signature commune
3. **Store Pinia** — Actions pures, état centralisé, computed reactif
4. **Tests d'abord** — `.spec.ts` pour logique, patterns tests fournis
5. **Logs informatifs** — ExecutionLog avec snapshots data

👉 Détails: [PATTERNS-CONVENTIONS.md](./PATTERNS-CONVENTIONS.md)

---

## ✅ Checklist avant commit

- [ ] Tests passent: `npm run test`
- [ ] Build réussit: `npm run build`
- [ ] Pas d'errors TypeScript
- [ ] Pas d'errors console au dev
- [ ] Code suit conventions du projet
- [ ] Commit message descriptif

---

## 📞 FAQ

### "Je dois ajouter un champ à la config d'un nœud"

1. Modifier `types.ts` interface config
2. Modifier `schema.ts` schéma Zod (parallèle)
3. Ajouter UI input dans dialogue config
4. Tester validation client

→ [INDEX-FICHIERS.md → Modifier config nœud](./INDEX-FICHIERS.md#-modifier-config-nœud)

### "Je dois ajouter nouveau type nœud"

Checklist complète 10 étapes avec tous fichiers.

→ [GUIDE-DEMARRAGE.md → A. Ajouter type nœud](./GUIDE-DEMARRAGE.md#a-ajouter-nouveau-type-de-nœud)

### "Comment la validation fonctionne?"

Validation en 3 couches:
1. TypeScript types (`types.ts`)
2. Zod schemas (`schema.ts`) — runtime validation + transform
3. Composant UI — affiche erreurs inline

→ [PATTERNS-CONVENTIONS.md → Validation en couches](./PATTERNS-CONVENTIONS.md#pattern-validation-en-couches)

### "Comment déboguer exécution pipeline?"

1. Ajouter logs dans `runPipeline.ts` ou `nodeExecutors.ts`
2. Reproduire en test `.spec.ts`
3. Inspecter logs RunConsole
4. Vérifier pathUtils si paths impliqués

→ [PATTERNS-CONVENTIONS.md → Debugging](./PATTERNS-CONVENTIONS.md#-patterns-debugging)

### "Comment utiliser les variables?"

Variables créées par nœud `setVariable` → réutilisables dans:
- Champs globaux: `#variable`
- Templates Map/Transform: `{chemin}` et `{#variable}`
- Les valeurs viennent de l'environnement actif (override) si défini, sinon de la valeur de base

Validation: nom = identifiant valide (alphanumérique + _ + $)

→ [ARCHITECTURE.md → SetVariable](./ARCHITECTURE.md#3-setvariable-extraction-variables)

---

## 📌 Mémo rapide

| Besoin | Fichier | Action |
|--------|---------|--------|
| Ajouter type nœud | domain/types.ts | Union type + interface config |
| Valider données | domain/schema.ts | Zod schema |
| Exec nœud | engine/nodeExecutors.ts | Fonction executeXxx |
| UI config | components/InspectorPanel.vue | Dialogue input |
| État app | stores/pipelineEditorStore.ts | Action Pinia |
| Texte UI | i18n/messages.json | Clé traduction |
| Sauvegarde | services/pipelineStorage.ts | localStorage |
| Tests | *.spec.ts | Vitest |

---

## 🎓 Pour devenir expert du projet

1. Lire ARCHITECTURE.md en entier (20 min)
2. Lire PATTERNS-CONVENTIONS.md en entier (15 min)
3. Implémenter petit feature guidé (1-2h)
4. Refactoriser un pattern existant (1-2h)
5. Ajouter nouveau type nœud (3-4h avec tests)

**Total:** ~8-10h pour maitrise solide du projet

---

## 📚 Références externes

- [Vue 3 Documentation](https://vuejs.org/)
- [Pinia](https://pinia.vuejs.org/)
- [PrimeVue](https://primevue.org/)
- [Vue Flow](https://vueflow.dev/)
- [Zod](https://zod.dev/)
- [Vitest](https://vitest.dev/)
- [Vite](https://vitejs.dev/)

---

**Document généré:** 2026-06-18  
**Version app:** 0.0.0  
**Stack:** Vue 3 + TypeScript + Vite + Pinia
