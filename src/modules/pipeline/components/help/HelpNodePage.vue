<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import HelpFaqSection from '@/modules/pipeline/components/help/HelpFaqSection.vue'
import { helpNodeFieldDefs, isHelpNodeKey, type HelpNodeKey } from '@/modules/pipeline/components/help/helpDocData'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const nodeKey = computed<HelpNodeKey>(() => {
  const raw = String(route.params.nodeKey ?? '')
  if (isHelpNodeKey(raw)) {
    return raw
  }
  return 'start'
})

if (!isHelpNodeKey(String(route.params.nodeKey ?? ''))) {
  router.replace({ name: 'help-overview' })
}

const usageGuidance = computed(() => {
  const guidance: Record<HelpNodeKey, string> = {
    start: 'Utilisez ce noeud une seule fois au debut du pipeline pour definir un point d entree clair.',
    api: 'Ideal pour charger des donnees externes. Placez-le tot dans le flux pour alimenter les etapes suivantes.',
    setVariable: 'Utile pour memoriser des valeurs extraites et les reutiliser dans d autres noeuds ou requetes.',
    condition: 'A utiliser pour orienter le flux sur une condition binaire (vrai/faux) lisible.',
    filter: 'Parfait pour separer des listes volumineuses en lots acceptes/rejetes.',
    transform: 'Utilisez-le pour restructurer rapidement une charge utile avant output ou mapping final.',
    map: 'Approprie pour construire un schema cible propre a partir de donnees heterogenes.',
    output: 'A placer en fin de flux pour exposer clairement le resultat a consommer.',
  }

  return guidance[nodeKey.value]
})

const bestPractices = computed(() => {
  const practices: Record<HelpNodeKey, string[]> = {
    start: [
      'Gardez une seule branche principale au depart pour simplifier le suivi des executions.',
      'Nommez rapidement les noeuds suivants pour rendre le graphe auto-documente.',
    ],
    api: [
      'Renseignez toujours un outputPath explicite (ex: $.api.customer).',
      'Testez URL/methode hors pipeline avant integration pour isoler les erreurs reseau.',
    ],
    setVariable: [
      'Utilisez des noms de variables stables et explicites (ex: customerId, authToken).',
      'Centralisez les extractions critiques dans un noeud dedie pour faciliter le debug.',
    ],
    condition: [
      'Verifiez le type de la valeur comparee (string/number/boolean) avant de choisir l operateur.',
      'Documentez la logique metier dans le nom du noeud (ex: Client Eligible).',
    ],
    filter: [
      'Exposez les rejects dans un outputPathRejected pour audit et reprise.',
      'Evitez les itemPath implicites sur des structures profondes: soyez explicite.',
    ],
    transform: [
      'Preferez des transformations courtes et enchainables plutot qu un noeud monolithique.',
      'Validez chaque targetPath pour eviter d ecraser accidentellement des donnees.',
    ],
    map: [
      'Traitez chaque champ cible independamment pour faciliter la maintenance.',
      'Ajoutez une fallbackValue sur les champs critiques.',
    ],
    output: [
      'Conservez un outputPath final stable pour les consommateurs aval.',
      'Ajoutez une verification juste avant output sur les pipelines sensibles.',
    ],
  }

  return practices[nodeKey.value]
})

const commonMistakes = computed(() => {
  const mistakes: Record<HelpNodeKey, string[]> = {
    start: ['Creer plusieurs noeuds Depart dans un meme flux.'],
    api: ['Laisser outputPath vide, ce qui complique la reutilisation de la reponse.'],
    setVariable: ['Ecraser une variable existante sans verifier sa portee metier.'],
    condition: ['Comparer une valeur booleenne avec un type texte.'],
    filter: ['Filtrer sur un sourcePath qui ne pointe pas vers un tableau.'],
    transform: ['Ecrire vers un targetPath non desire en raison d une faute de chemin.'],
    map: ['Ne pas definir de fallback sur des champs potentiellement absents.'],
    output: ['Sortir un objet incomplet faute de verification finale.'],
  }

  return mistakes[nodeKey.value]
})

const faqItems = computed(() => [
  {
    question: 'Dois-je renommer ce noeud ?',
    answer: 'Oui, un nom explicite accelere le debug et la comprehension du flux par l equipe.',
  },
  {
    question: 'Quand valider sa configuration ?',
    answer: 'Validez juste apres edition, avant de connecter les branches suivantes.',
  },
  {
    question: 'Comment eviter les erreurs silencieuses ?',
    answer: 'Utilisez des outputPath explicites et verifiez les logs de la console apres chaque execution.',
  },
])
</script>

<template>
  <section class="help-doc-page">
    <h2 class="help-doc-title">{{ t(`pipelineEditor.help.nodes.${nodeKey}.title`) }}</h2>
    <p class="help-doc-text">{{ t(`pipelineEditor.help.nodes.${nodeKey}.desc`) }}</p>

    <p v-if="helpNodeFieldDefs[nodeKey].length === 0" class="help-doc-muted">
      {{ t(`pipelineEditor.help.nodes.${nodeKey}.noFields`) }}
    </p>

    <table v-else class="help-doc-table">
      <tbody>
        <tr v-for="field in helpNodeFieldDefs[nodeKey]" :key="field.labelKey">
          <th>{{ t(field.labelKey) }}</th>
          <td>{{ t(field.descKey) }}</td>
        </tr>
      </tbody>
    </table>

    <p class="help-doc-label">{{ t('pipelineEditor.help.exampleLabel') }}</p>
    <code class="help-doc-code">{{ t(`pipelineEditor.help.nodes.${nodeKey}.example`) }}</code>

    <div class="help-doc-guidance">
      <h3>Quand l utiliser</h3>
      <p>{{ usageGuidance }}</p>
    </div>

    <div class="help-doc-guidance help-doc-guidance-grid">
      <section>
        <h3>Bonnes pratiques</h3>
        <ul>
          <li v-for="item in bestPractices" :key="item">{{ item }}</li>
        </ul>
      </section>
      <section>
        <h3>Erreurs frequentes</h3>
        <ul>
          <li v-for="item in commonMistakes" :key="item">{{ item }}</li>
        </ul>
      </section>
    </div>

    <div v-if="nodeKey === 'transform'" class="help-doc-extra">
      <p class="help-doc-label">{{ t('pipelineEditor.help.nodes.transform.modeExamples.title') }}</p>
      <table class="help-doc-table">
        <tbody>
          <tr>
            <th>{{ t('inspector.options.transformMode.pickPath') }}</th>
            <td>{{ t('pipelineEditor.help.nodes.transform.modeExamples.pickPath') }}</td>
          </tr>
          <tr>
            <th>{{ t('inspector.options.transformMode.assignLiteral') }}</th>
            <td>{{ t('pipelineEditor.help.nodes.transform.modeExamples.assignLiteral') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="nodeKey === 'map'" class="help-doc-extra">
      <p class="help-doc-label">{{ t('pipelineEditor.help.nodes.map.templateExamples.title') }}</p>
      <table class="help-doc-table">
        <tbody>
          <tr>
            <th>{{ t('pipelineEditor.help.nodes.map.templateExamples.singlePath') }}</th>
            <td>{{ t('pipelineEditor.help.nodes.map.templateExamples.singlePathDesc') }}</td>
          </tr>
          <tr>
            <th>{{ t('pipelineEditor.help.nodes.map.templateExamples.concatenation') }}</th>
            <td>{{ t('pipelineEditor.help.nodes.map.templateExamples.concatenationDesc') }}</td>
          </tr>
          <tr>
            <th>{{ t('pipelineEditor.help.nodes.map.templateExamples.staticValue') }}</th>
            <td>{{ t('pipelineEditor.help.nodes.map.templateExamples.staticValueDesc') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <HelpFaqSection :items="faqItems" />
  </section>
</template>

<style scoped>
.help-doc-title {
  margin: 0 0 0.8rem;
  font-size: 1.1rem;
}

.help-doc-text {
  margin: 0 0 0.8rem;
  color: var(--text-soft);
  line-height: 1.55;
}

.help-doc-muted {
  margin: 0.4rem 0 0.7rem;
  color: var(--text-soft);
  font-style: italic;
}

.help-doc-label {
  margin: 0.7rem 0 0.3rem;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-soft);
  font-weight: 700;
}

.help-doc-code {
  display: block;
  background: var(--surface-hover, rgba(0, 0, 0, 0.04));
  border-radius: 6px;
  padding: 0.42rem 0.58rem;
  font-size: 0.82rem;
  word-break: break-word;
}

.help-doc-extra {
  margin-top: 0.85rem;
}

.help-doc-guidance {
  margin-top: 0.85rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.65rem;
  background: color-mix(in srgb, var(--panel) 94%, #ffffff);
}

.help-doc-guidance h3 {
  margin: 0 0 0.38rem;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.help-doc-guidance p {
  margin: 0;
  color: var(--text-soft);
  line-height: 1.5;
}

.help-doc-guidance-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.help-doc-guidance ul {
  margin: 0;
  padding-left: 1rem;
  color: var(--text-soft);
}

.help-doc-guidance li + li {
  margin-top: 0.25rem;
}

.help-doc-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.help-doc-table tr + tr {
  border-top: 1px solid var(--border);
}

.help-doc-table th {
  width: 34%;
  text-align: left;
  vertical-align: top;
  padding: 0.42rem 0.58rem;
  color: var(--text-soft);
  background: var(--surface-hover, rgba(0, 0, 0, 0.03));
}

.help-doc-table td {
  vertical-align: top;
  padding: 0.42rem 0.58rem;
}

@media (max-width: 760px) {
  .help-doc-guidance-grid {
    grid-template-columns: 1fr;
  }
}
</style>
