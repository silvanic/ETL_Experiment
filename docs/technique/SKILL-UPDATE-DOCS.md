---
title: "Skill: Mettre à jour la documentation automatiquement"
description: "Analyseur automatique de divergences code-documentation pour ETL Experiment"
keywords: [documentation, automation, maintenance, skill]
---

# Skill: Update ETL Experiment Documentation

## 🎯 Objectif

Analyser automatiquement le code source du projet ETL Experiment et mettre à jour la documentation technique pour assurer la cohérence permanente entre implémentation et documentation.

## 📖 Utilisation

### Invocation simple
```
/update-etl-docs
```

### Avec options (futures)
```
/update-etl-docs --no-apply           # Rapport seulement, pas de modification
/update-etl-docs --verbose            # Logs détaillés pour debug
/update-etl-docs --focus=types        # Analyser seulement types de nœuds
```

---

## 🔍 Analyse effectuée

Le Skill analyse les éléments suivants du code:

### 1. **Types de nœuds** (`src/modules/pipeline/domain/types.ts`)
- Extrait `export type NodeType` et ses variantes
- Pour chaque type, identifie la config interface associée
- Vérifie cohérence avec la table dans `docs/technique/ARCHITECTURE.md`
- Détecte nouveaux types ou types supprimés

### 2. **Composants Vue** (`src/modules/pipeline/components/`)
- Liste tous les composants `.vue`
- Croise avec la liste documentée dans `docs/technique/INDEX-FICHIERS.md`
- Détecte: nouveaux composants, suppressions, renommages

### 3. **Services** (`src/modules/pipeline/services/`)
- Extrait les functions exportées avec leurs signatures
- Vérifie la documentation dans `ARCHITECTURE.md` (section Services)
- Détecte: nouvelles functions, signatures modifiées, suppressions

### 4. **Moteur d'exécution** (`src/modules/pipeline/engine/nodeExecutors.ts`)
- Liste tous les exécuteurs de nœuds disponibles
- Vérifie correspondance 1-à-1 avec types documentés
- Détecte: exécuteurs manquants ou orphelins

### 5. **Dialogs** (`src/modules/pipeline/components/dialogs/`)
- Inventorie tous les fichiers dialogs
- Croise avec descriptions dans `ARCHITECTURE.md`
- Détecte: dialogs non documentés, descriptions obsolètes

### 6. **Stores** (`src/modules/pipeline/stores/`)
- Analyse les stores Pinia
- Extrait les actions et states
- Vérifie cohérence avec documentation

---

## 📊 Résultat

### Phase 1: Rapport d'analyse
```markdown
## 🔍 Audit Documentation - ETL Experiment

### ✅ Éléments OK
- 10 types de nœuds détectés (cohérent)
- 12 composants documentés (cohérent)
- 3 services documentés (cohérent)

### ⚠️ Divergences détectées
1. Nouveau composant: MyNewComponent.vue (non documenté)
2. Function supprimée: oldService.deleteAll() (doc obsolète)
3. Service rename: pipelineManager → pipelineOrchestrator

### 🔴 Erreurs
Aucune
```

### Phase 2: Changements proposés

```markdown
## 📝 Changements recommandés

### ARCHITECTURE.md
- Ligne 245: Ajouter description MyNewComponent.vue
- Ligne 308: Mettre à jour signature pipelineStorage.ts

### INDEX-FICHIERS.md
- Ligne 89: Ajouter MyNewComponent.vue
- Ligne 120: Supprimer oldService.deleteAll()

---
Appliquer ces changements? [Y/n]
```

### Phase 3: Exécution et validation

Si confirmé:
1. ✅ Applique les remplacements dans les fichiers docs
2. ✅ Vérifie la syntaxe (pas de cassure Markdown)
3. ✅ Vérifie que les liens relatifs restent valides
4. ✅ Retourne rapport de succès

---

## 🛠️ Implémentation

### Étape 1: Analyse du code
```typescript
// Pseudo-code
const nodeTypes = extractNodeTypes('src/modules/pipeline/domain/types.ts')
const components = listComponentsInDir('src/modules/pipeline/components/')
const services = extractExportedFunctions('src/modules/pipeline/services/')
const executors = extractExecutors('src/modules/pipeline/engine/nodeExecutors.ts')
const dialogs = listDialogsInDir('src/modules/pipeline/components/dialogs/')
```

### Étape 2: Analyse de la documentation
```typescript
// Pseudo-code
const docNodeTypes = extractTableFrom('docs/technique/ARCHITECTURE.md', '## Types de nœuds')
const docComponents = extractSectionFrom('docs/technique/INDEX-FICHIERS.md', '### src/modules/pipeline/components/')
const docServices = extractSectionFrom('docs/technique/ARCHITECTURE.md', '## Services')
```

### Étape 3: Comparaison et rapport
```typescript
// Pseudo-code
const divergences = compare({
  actual: { nodeTypes, components, services, executors, dialogs },
  documented: { docNodeTypes, docComponents, docServices }
})

generateReport(divergences)
```

### Étape 4: Exécution (si approuvé)
```typescript
// Pseudo-code
for (const change of changes) {
  replaceInFile(change.file, change.oldString, change.newString)
}
```

---

## ✅ Checklist avant exécution

- [ ] Code modifié commité ou sauvegardé
- [ ] Pas de merges en cours sur les fichiers docs
- [ ] Vous avez 5 minutes pour vérifier suggestions

---

## 📋 Exemples de cas d'usage

### Cas 1: Ajouter un nouveau type de nœud

**Avant:**
```typescript
export type NodeType = 'start' | 'api' | 'setVariable' | ... | 'output'
```

**Après:**
```typescript
export type NodeType = 'start' | 'api' | 'setVariable' | ... | 'decisionBlock' | 'output'
```

**Résultat du Skill:**
```
⚠️ Nouveau type détecté: 'decisionBlock'
📝 Changement proposé:
   ARCHITECTURE.md ligne 210: Ajouter décisionBlock à la table des types
   ARCHITECTURE.md ligne 340: Ajouter description détaillée de DecisionBlock
```

---

### Cas 2: Ajouter une function au service

**Avant:**
```typescript
export function savePipeline(def: PipelineDefinition): void { ... }
export function loadSavedPipeline(id: string): PipelineDefinition | null { ... }
```

**Après:**
```typescript
export function savePipeline(def: PipelineDefinition): void { ... }
export function loadSavedPipeline(id: string): PipelineDefinition | null { ... }
export function exportPipelineAsJson(def: PipelineDefinition): string { ... }
```

**Résultat du Skill:**
```
⚠️ Nouvelle function détectée: exportPipelineAsJson
📝 Changement proposé:
   ARCHITECTURE.md ligne 285: Ajouter exportPipelineAsJson à la liste services
```

---

### Cas 3: Renommer un composant

**Avant:**
```
src/modules/pipeline/components/InspectorPanel.vue
```

**Après:**
```
src/modules/pipeline/components/NodeInspectorPanel.vue
```

**Résultat du Skill:**
```
⚠️ Composant renommé: InspectorPanel → NodeInspectorPanel
📝 Changements proposés:
   INDEX-FICHIERS.md ligne 45: Mettre à jour InspectorPanel → NodeInspectorPanel
   ARCHITECTURE.md ligne 210: Mettre à jour références (4 occurrences)
```

---

## 🔄 Flux recommandé

### Workflow typique:

```
1. Développement
   ↓
2. Commit majeur (nouveau nœud, service, etc.)
   ↓
3. Invoquer /update-etl-docs
   ↓
4. Vérifier rapport
   ↓
5. Approuver changements
   ↓
6. Docs mises à jour automatiquement
   ↓
7. Audit sauvegardé dans /memories/session/
```

### Fréquence recommandée:

- 🔴 **Après chaque feature majeure** (nouveau nœud, service)
- 🟠 **Hebdomadaire** si développement actif
- 🟡 **Mensuellement** en maintenance
- 🟢 **Avant release** pour synchronisation finale

---

## ⚙️ Configuration & maintenance

### Fichiers surveillés

Le Skill analyse ces emplacements:
```
src/modules/pipeline/domain/types.ts
src/modules/pipeline/components/*.vue
src/modules/pipeline/engine/nodeExecutors.ts
src/modules/pipeline/services/*.ts
src/modules/pipeline/stores/*.ts
docs/technique/*.md
```

### Fichiers documentés mis à jour

```
docs/technique/ARCHITECTURE.md
docs/technique/INDEX-FICHIERS.md
docs/technique/PATTERNS-CONVENTIONS.md
docs/technique/GUIDE-DEMARRAGE.md
```

### Limitation actuelles

- ⚠️ Pas d'analyse des composants imbriqués (scripts enfants)
- ⚠️ Pas de vérification des versions de dépendances
- ⚠️ Pas d'analyse des changements de logique (code seulement)

---

## 🐛 Troubleshooting

### Q: Le Skill ne détecte aucun changement

**A:** C'est normal si le code n'a pas réellement changé. Vérifiez que vous avez modifié des fichiers clés (`types.ts`, `nodeExecutors.ts`, `*.vue` dans components, `services/`).

### Q: Rapport contient faux positifs

**A:** Le Skill est basé sur analyse statique. Avant d'appliquer:
1. Vérifiez manuellement les changements
2. Testez que le code compile
3. Relancez le Skill si vous trouvez des erreurs

### Q: Je veux annuler les changements appliqués

**A:** Utilisez `Ctrl+Z` dans l'éditeur pour revenir en arrière, ou consultez Git pour historique.

---

## 📚 Voir aussi

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Architecture complète
- [INDEX-FICHIERS.md](./INDEX-FICHIERS.md) — Index fichiers du projet
- [PATTERNS-CONVENTIONS.md](./PATTERNS-CONVENTIONS.md) — Patterns et conventions
- [GUIDE-DEMARRAGE.md](./GUIDE-DEMARRAGE.md) — Guide de démarrage

---

## 📞 Support

Pour des questions ou signaler des faux positifs:
1. Consultez `/memories/session/docs-audit-*.md` pour historique des audits
2. Vérifiez que la structure du projet n'a pas changé radicalement
3. Relancez avec `--verbose` pour logs détaillés

---

**Statut**: ✅ Prêt à utiliser  
**Dernière mise à jour**: 2026-07-01  
**Maintenance**: Automatisée via Skill `/update-etl-docs`
