# Plan detaille - Noeuds composites (Niveau 3)

## 1) Objectif
Mettre en place des noeuds composites (sous-pipelines executables) pour alleger le canvas principal, tout en gardant une edition en profondeur et une execution imbriquee observable.

Objectifs UX:
- Canvas parent lisible (composites affiches en mode boite noire).
- Navigation simple vers un sous-editeur de composite.
- Logs parent/enfant avec niveau de detail repliable.

Objectifs techniques:
- Compatibilite sauvegarde/import JSON.
- Validation schema stricte (Zod).
- Non-regression sur le moteur existant.

## 2) Perimetre
Inclus:
- Types domaine pour composite.
- Validation schema.
- Etat store pour navigation imbriquee.
- UI parent + sous-editeur.
- Execution imbriquee niveau 3.
- Logs hierarchiques dans la console.
- Tests unitaires et integration locale.

Exclus (pour cette iteration):
- Marketplace de composites partages.
- Versionning avance multi-projet.
- Permissions/roles.

## 3) Architecture cible
Principe:
- Un noeud composite dans le pipeline parent encapsule un sous-pipeline.
- Le sous-pipeline expose un contrat d'entree/sortie.
- A l'execution, le noeud composite lance une execution interne du sous-pipeline.
- Les logs internes sont rattaches au noeud parent (hierarchie).

Composants impactes:
- src/modules/pipeline/domain/types.ts
- src/modules/pipeline/domain/schema.ts
- src/modules/pipeline/domain/defaults.ts
- src/modules/pipeline/stores/pipelineEditorStore.ts
- src/modules/pipeline/components/NodePalette.vue
- src/modules/pipeline/components/PipelineCanvas.vue
- src/modules/pipeline/components/InspectorPanel.vue
- src/modules/pipeline/components/PipelineEditorPage.vue
- src/modules/pipeline/components/RunConsole.vue
- src/modules/pipeline/engine/nodeExecutors.ts
- src/modules/pipeline/engine/runPipeline.ts
- src/router/index.ts
- src/i18n/messages.json

## 4) Plan de livraison (2 sprints)

### Sprint A - UX et edition (sans execution interne complete)
Duree estimee: 4 a 5 jours

#### A1. Cadrage fonctionnel (0.5 jour)
- Definir le contrat composite:
  - inputs: liste des entrees exposees
  - outputs: liste des sorties exposees
  - onError: stop | continue
  - timeoutMs, retryCount
- Definir les regles de validite minimales:
  - au moins 1 point d'entree interne
  - au moins 1 point de sortie interne
- Valider le parcours utilisateur:
  - creer composite, ouvrir, editer, revenir

Livrable:
- Spec courte validee (ce document + decisions).

#### A2. Domaine et schema (1 jour)
- Etendre NodeType avec composite.
- Ajouter CompositeNodeConfig dans types.ts.
- Ajouter schema Zod correspondant dans schema.ts.
- Ajouter defaults/factory dans defaults.ts.

Livrable:
- JSON import/export accepte les composites.

#### A3. Store et navigation imbriquee (1 a 1.5 jours)
- Ajouter etat:
  - editorScope: root | composite
  - openedCompositeId: string | null
  - scopeStack: historique navigation
- Ajouter actions:
  - openComposite(compositeId)
  - closeComposite()
  - updateCompositeContract(...)
  - validateComposite(...)

Livrable:
- Navigation parent/sous-editeur operationnelle.

#### A4. UI maquette fonctionnelle (2 jours)
- NodePalette: section composites.
- PipelineCanvas: rendu compact des composites + double-clic ouvrir.
- InspectorPanel: onglets Contrat/Parametres/Execution.
- PipelineEditorPage: breadcrumb parent > composite.
- Router: route d'edition composite.
- i18n: textes FR/EN.

Livrable:
- Maquette UX complete, sans execution interne finale.

### Sprint B - Moteur imbrique, logs et stabilisation
Duree estimee: 4 a 5 jours

#### B1. Execution niveau 3 (2 jours)
- nodeExecutors.ts:
  - ajouter compositeExecutor.
- runPipeline.ts:
  - permettre execution interne d'un sous-pipeline depuis compositeExecutor.
  - appliquer mapping input -> contexte enfant.
  - appliquer mapping output enfant -> contexte parent.
  - respecter onError/timeout/retry du contrat.

Livrable:
- Composite executable de bout en bout.

#### B2. Console et observabilite (0.5 a 1 jour)
- RunConsole:
  - afficher groupe parent (resume).
  - details internes repliables.
  - message d'erreur parent + details enfants.

Livrable:
- Logs hierarchiques lisibles.

#### B3. Tests et non-regression (1.5 a 2 jours)
- runPipeline.spec.ts:
  - succes composite.
  - erreur composite (stop/continue).
  - timeout/retry.
- nodeExecutors.spec.ts:
  - mapping input/output.
- pipelineEditorStore.spec.ts:
  - navigation scope et edition composite.
- Build + tests complets.

Livrable:
- Baseline stable pre-merge.

## 5) Decoupage technique detaille

### 5.1 Types (types.ts)
Ajouter:
- NodeType: + 'composite'
- CompositeIOField:
  - id, name, path, required
- CompositeContract:
  - inputs: CompositeIOField[]
  - outputs: CompositeIOField[]
  - onError: 'stop' | 'continue'
  - timeoutMs?: number
  - retryCount?: number
- CompositeNodeConfig:
  - contract: CompositeContract
  - subPipeline: PipelineDefinition
  - inputBindings: Record<string, string>
  - outputBindings: Record<string, string>

Attention:
- Eviter recursion infinie type-level si besoin en utilisant un type simplifie pour subPipeline.

### 5.2 Schema (schema.ts)
Ajouter:
- compositeContractSchema
- compositeConfigSchema
- branche 'composite' dans nodeDataSchema (discriminatedUnion)

Validations minimales:
- contract.inputs/outputs non vides (ou regle explicite si vide autorise).
- binding references coherentes avec les champs contractuels.

### 5.3 Defaults (defaults.ts)
Ajouter:
- defaultCompositeConfig
- labels par defaut
- createNode('composite', x, y)

### 5.4 Store (pipelineEditorStore.ts)
Ajouter etat:
- editorScope
- openedCompositeId
- scopeStack

Ajouter actions:
- openComposite
- closeComposite
- updateCompositeContract
- updateCompositeSubPipeline
- validateComposite

Comportement:
- En scope composite, nodes/edges affiches correspondent au sous-pipeline ouvert.
- Sauvegarde reconcilie modifications dans le parent.

### 5.5 UI
NodePalette.vue:
- Bloc composites (ajout d'un composite vide ou depuis preset).

PipelineCanvas.vue:
- Node card composite: titre, badges I/O, etat validite.
- Interaction double-clic => openComposite.

InspectorPanel.vue:
- Form contrat I/O.
- Parametres execution: onError/timeout/retry.
- Bouton "Ouvrir sous-pipeline".

PipelineEditorPage.vue:
- Breadcrumb et indicateur de scope.
- Retour scope parent.

router/index.ts:
- Route dediee edition composite (optionnelle mais recommandee).

### 5.6 Engine
nodeExecutors.ts:
- compositeExecutor:
  - construit contexte enfant.
  - execute sous-pipeline.
  - renvoie message/details/dataOut consolides.

runPipeline.ts:
- conserver orchestration existante.
- support logs imbriques (meta parentCompositeId / depth).

### 5.7 RunConsole.vue
- Groupement par composite.
- Expand/collapse logs internes.
- Resume clair (success, duration, retries).

## 6) Strategie de tests

Unitaires:
- mapping input/output du composite.
- propagation erreurs.
- timeout et retry.
- navigation store scope root/composite.

Integration locale:
- Pipeline parent avec 1 composite + output.
- Pipeline parent avec 2 composites en chaine.
- Composite en erreur avec onError=continue.

Non-regression:
- Tous pipelines sans composite doivent continuer a fonctionner a l'identique.

## 7) Risques et mitigations

Risque 1: complexite type/schema
- Mitigation: introduire types progressivement + tests schema dedies.

Risque 2: confusion UX entre parent et sous-editeur
- Mitigation: breadcrumb visible + bandeau de contexte + bouton retour explicite.

Risque 3: logs trop verbeux
- Mitigation: resume parent par defaut, details repliables.

Risque 4: recursion composite dans composite
- Mitigation: interdire au debut, puis autoriser plus tard avec garde profondeur max.

## 8) Definition of Done
Un item est termine si:
- le composite est creable, editable et navigable;
- l'execution interne fonctionne avec contrat input/output;
- les logs internes sont consultables proprement;
- import/export JSON valide;
- npm run build et npm run test passent.

## 9) Checklist de demarrage (ordre recommande)
1. Types + schema + defaults.
2. Store scope + actions open/close composite.
3. UI Canvas/Inspector/Breadcrumb (Sprint A termine).
4. compositeExecutor + execution imbriquee.
5. RunConsole hierarchique.
6. Tests complets + stabilisation.

## 10) Estimation globale
- Sprint A: 4 a 5 jours
- Sprint B: 4 a 5 jours
- Total: 8 a 10 jours ouvres (hors aleas)

## 11) Notes de relecture
Points a valider en priorite pendant la relecture:
- contrat I/O (simple mais suffisant?)
- comportement onError/timeout/retry
- niveau de details des logs
- choix route dediee vs mode unique de page

## 12) Backlog operationnel (format IA, priorise)

Objectif:
- Permettre a une IA de coder par petits lots, avec controle strict des regressions.

Convention priorite:
- P0: indispensable pour avancer.
- P1: important mais peut attendre un lot.
- P2: confort/qualite.

Convention effort:
- XS: < 0.5 jour
- S: 0.5 a 1 jour
- M: 1 a 2 jours

| ID | Priorite | Effort | Lot | Tache | Fichiers cibles | Critere d'acceptation |
|---|---|---|---|---|---|---|
| T01 | P0 | XS | Domaine | Ajouter `composite` dans NodeType + types associes | src/modules/pipeline/domain/types.ts | Le typage compile sans `any` ajoute |
| T02 | P0 | S | Domaine | Ajouter schemas Zod composite | src/modules/pipeline/domain/schema.ts | Import/export JSON composite valide |
| T03 | P0 | XS | Domaine | Ajouter defaults composite | src/modules/pipeline/domain/defaults.ts | `createNode('composite', ...)` fonctionne |
| T04 | P0 | M | Store | Ajouter scope root/composite + open/close | src/modules/pipeline/stores/pipelineEditorStore.ts | Navigation parent/enfant stable |
| T05 | P1 | S | UI | Ajouter entree palette composite | src/modules/pipeline/components/NodePalette.vue | Un bouton ajoute un composite |
| T06 | P1 | M | UI | Rendu node composite + double-clic ouvrir | src/modules/pipeline/components/PipelineCanvas.vue | Double-clic ouvre le sous-editeur |
| T07 | P1 | M | UI | Inspector composite (contrat + execution) | src/modules/pipeline/components/InspectorPanel.vue | Valeurs modifiables et persistees |
| T08 | P1 | S | UI | Breadcrumb scope | src/modules/pipeline/components/PipelineEditorPage.vue | Retour parent operationnel |
| T09 | P1 | XS | Router | Route edition composite | src/router/index.ts | Route accessible sans erreur |
| T10 | P0 | M | Engine | `compositeExecutor` + execution interne | src/modules/pipeline/engine/nodeExecutors.ts, src/modules/pipeline/engine/runPipeline.ts | Sous-pipeline execute et renvoie outputs |
| T11 | P1 | S | Console | Logs hierarchiques pliables | src/modules/pipeline/components/RunConsole.vue | Resume parent + details enfants |
| T12 | P0 | M | Tests | Couvrir cas composite | src/modules/pipeline/engine/*.spec.ts, src/modules/pipeline/stores/pipelineEditorStore.spec.ts | Tests verts + non-regression |
| T13 | P2 | XS | i18n | Ajouter libelles FR/EN | src/i18n/messages.json | Aucune cle manquante en UI |

## 13) Sequence de travail anti-erreur (obligatoire)

Regle principale:
- Un seul lot fonctionnel a la fois.
- Build/tests a chaque lot.
- Pas de refactor global tant que les cas composites ne passent pas.

Ordre recommande:
1. T01 -> T03 (domaine)
2. T04 (store)
3. T05 -> T09 (UI/navigation)
4. T10 (engine)
5. T11 (console)
6. T12 -> T13 (tests + i18n)

Gate de validation apres chaque lot:
1. `npm run build`
2. `npm run test`
3. Ouvrir un pipeline simple existant (sans composite) et verifier execution.
4. Ouvrir un pipeline avec composite et verifier UX minimale attendue.

## 14) Prompts IA prets a l'emploi (copier-coller)

Utilisation:
- Lancer un prompt par lot.
- Ne jamais demander 5 lots en une fois.

### Prompt Lot Domaine (T01-T03)
Contexte:
- Projet Vue 3 + TypeScript + Zod.
- Je veux introduire un type de noeud `composite` sans casser l'existant.

Tache:
1. Modifier les types dans `src/modules/pipeline/domain/types.ts` pour ajouter `composite` et `CompositeNodeConfig`.
2. Etendre `src/modules/pipeline/domain/schema.ts` avec les schemas Zod associes.
3. Etendre `src/modules/pipeline/domain/defaults.ts` pour permettre `createNode('composite', x, y)`.
4. Garder strictement le style existant du projet.

Contraintes:
- Pas de refactor hors sujet.
- Pas d'introduction de `any`.
- Garantir compatibilite des noeuds existants.

Verification demandee:
- Lancer `npm run build` puis `npm run test`.
- Si erreur, proposer correction et l'appliquer.

### Prompt Lot Store/UI Navigation (T04-T09)
Contexte:
- Le type composite existe deja.

Tache:
1. Ajouter la notion de scope `root|composite` dans `src/modules/pipeline/stores/pipelineEditorStore.ts`.
2. Ajouter les actions `openComposite` et `closeComposite`.
3. Ajouter l'entree palette dans `src/modules/pipeline/components/NodePalette.vue`.
4. Ajouter le rendu/interaction composite dans `src/modules/pipeline/components/PipelineCanvas.vue`.
5. Ajouter breadcrumb et navigation dans `src/modules/pipeline/components/PipelineEditorPage.vue`.
6. Mettre a jour `src/router/index.ts` si necessaire pour une route dediee.

Contraintes:
- Ne pas casser la creation/edition des noeuds non-composites.
- Conserver les conventions PrimeVue et i18n existantes.

Verification demandee:
- Build + tests.
- Verification manuelle: un double-clic sur un composite ouvre le sous-editeur.

### Prompt Lot Engine (T10)
Contexte:
- UI et store composites sont en place.

Tache:
1. Ajouter `compositeExecutor` dans `src/modules/pipeline/engine/nodeExecutors.ts`.
2. Faire executer un sous-pipeline depuis `src/modules/pipeline/engine/runPipeline.ts`.
3. Mapper `inputBindings` vers contexte enfant et `outputBindings` vers contexte parent.
4. Appliquer `onError`, `timeoutMs`, `retryCount`.

Contraintes:
- Garder le comportement actuel des noeuds standards.
- Pas de boucle infinie: garde profondeur max pour composite imbrique.

Verification demandee:
- Ajouter tests unitaires specifiques.
- Build + tests verts.

### Prompt Lot Console + Tests + i18n (T11-T13)
Contexte:
- Execution composite disponible.

Tache:
1. Afficher logs hierarchiques dans `src/modules/pipeline/components/RunConsole.vue`.
2. Ajouter/mettre a jour tests sur runPipeline, nodeExecutors, store.
3. Completer messages dans `src/i18n/messages.json`.

Contraintes:
- Vue console lisible par defaut (resume), details repliables.
- Pas de regression sur pipelines sans composite.

Verification demandee:
- Build + tests.
- Fournir liste des cas testes.

## 15) Contrat de qualite pour l'IA (checklist stricte)

Avant de coder:
1. Lire les fichiers cibles complets.
2. Identifier les points de couplage (types, schema, store, engine).
3. Annoncer clairement le lot en cours.

Pendant le code:
1. Appliquer des patches petits et atomiques.
2. Eviter les renommages de symboles non necessaires.
3. Ne pas modifier le style global.

Apres le code:
1. Build et tests.
2. Verifier un scenario sans composite.
3. Verifier un scenario avec composite.
4. Donner un resume des fichiers modifies et pourquoi.

## 16) Scenarios de verification manuelle (vibe coding)

Scenario V1 (non-regression):
1. Creer pipeline simple start -> api -> output.
2. Executer.
3. Resultat attendu: meme comportement qu'avant.

Scenario V2 (composite minimal):
1. Ajouter noeud composite.
2. Ouvrir sous-editeur.
3. Creer sous-pipeline interne valide.
4. Revenir parent et executer.
5. Resultat attendu: succes et output mappe dans parent.

Scenario V3 (erreur controlee):
1. Sous-pipeline interne qui echoue.
2. Tester `onError=stop` puis `onError=continue`.
3. Resultat attendu: comportement conforme au contrat.

Scenario V4 (retry/timeout):
1. Configurer `retryCount` > 0.
2. Simuler timeout interne.
3. Resultat attendu: retries traces, puis statut final coherent.

## 17) Strategie de commits (pour minimiser les regressions)

Proposition de commits:
1. `feat(domain): add composite node types and schema`
2. `feat(store): add root/composite editor scope navigation`
3. `feat(ui): add composite node interactions and breadcrumb`
4. `feat(engine): execute sub-pipeline in composite executor`
5. `feat(console): add hierarchical composite logs`
6. `test(composite): cover execution, errors, retry and navigation`
7. `chore(i18n): add composite labels and messages`

Regle:
- Un commit = un lot coherent + build/tests verts.

## 18) Critere de pret a merger

Le lot composite est pret a merger si:
1. `npm run build` passe.
2. `npm run test` passe.
3. Les 4 scenarios V1 a V4 sont valides.
4. Aucune regression detectee sur un pipeline legacy.
5. Les logs restent lisibles (resume parent, details enfants repliables).
