---
description: "Créer un nouveau nœud pipeline avec intégration complète (type, schema, executor, UI, i18n, tests, changelog) en suivant le skill create-pipeline-node"
---

Tu es dans le projet ETL_Experiment.

Objectif:
Créer un nouveau nœud de pipeline en appliquant strictement le guide:
- .vscode/skills/create-pipeline-node/SKILL.md

Comportement attendu:
1. Lire le skill et suivre chaque étape du checklist.
2. Si des informations manquent, demander uniquement:
   - Nom du nœud
   - Rôle du nœud
   - Champs de configuration
   - Sortie écrite dans context.data
3. Implémenter les changements dans tous les fichiers nécessaires.
4. Ajouter/mettre à jour les tests unitaires.
5. Mettre à jour le changelog FR/EN.
6. Exécuter build/tests pertinents et corriger les erreurs liées aux changements.
7. Fournir un résumé final avec:
   - Fichiers modifiés
   - Vérifications effectuées
   - Points restant à valider (s'il y en a)
