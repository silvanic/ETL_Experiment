<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import HelpFaqSection from '@/modules/pipeline/components/help/HelpFaqSection.vue'

const { t } = useI18n()
const faqItems = computed(() => [
  {
    question: 'Quelle aggregation choisir en premier ?',
    answer: 'Commencez souvent par Any pour valider rapidement votre logique metier, puis ajustez vers All/None.',
  },
  {
    question: 'Pourquoi tout tombe dans la meme branche ?',
    answer: 'Cela peut venir d un chemin incorrect ou d un tableau homogène; verifiez vos donnees d entree.',
  },
  {
    question: 'Peut-on combiner wildcard et filtre ?',
    answer: 'Oui, utilisez Condition pour router globalement et Filter pour separer finement les elements.',
  },
])
</script>

<template>
  <section class="help-doc-page">
    <h2 class="help-doc-title">{{ t('pipelineEditor.help.section3Title') }}</h2>
    <p class="help-doc-text">{{ t('pipelineEditor.help.conditionArray.intro') }}</p>

    <table class="help-doc-table">
      <tbody>
        <tr>
          <th>{{ t('pipelineEditor.help.conditionArray.wildcardLabel') }}</th>
          <td>{{ t('pipelineEditor.help.conditionArray.wildcardDesc') }}</td>
        </tr>
        <tr>
          <th>{{ t('inspector.options.conditionAggregation.any') }}</th>
          <td>{{ t('pipelineEditor.help.conditionArray.anyDesc') }}</td>
        </tr>
        <tr>
          <th>{{ t('inspector.options.conditionAggregation.all') }}</th>
          <td>{{ t('pipelineEditor.help.conditionArray.allDesc') }}</td>
        </tr>
        <tr>
          <th>{{ t('inspector.options.conditionAggregation.none') }}</th>
          <td>{{ t('pipelineEditor.help.conditionArray.noneDesc') }}</td>
        </tr>
        <tr>
          <th>{{ t('pipelineEditor.help.conditionArray.examplesLabel') }}</th>
          <td>{{ t('pipelineEditor.help.conditionArray.examplesDesc') }}</td>
        </tr>
      </tbody>
    </table>

    <section class="help-doc-panel">
      <h3>Checklist de debug</h3>
      <ul>
        <li>Verifier que le chemin de gauche contient bien un segment wildcard (ex: $.users.*.age).</li>
        <li>Confirmer que la valeur de droite est du meme type que la valeur comparee.</li>
        <li>Relire le mode d aggregation choisi (Any/All/None) avant d interpreter le resultat.</li>
      </ul>
    </section>

    <section class="help-doc-panel">
      <h3>Interpretation rapide</h3>
      <p>
        Si toutes les donnees passent cote vrai ou cote faux, ce n est pas forcement un bug:
        c est souvent un signal metier utile pour qualifier la qualite ou la distribution des donnees.
      </p>
    </section>

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

.help-doc-panel {
  margin-top: 0.85rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.7rem;
  background: color-mix(in srgb, var(--panel) 94%, #ffffff);
}

.help-doc-panel h3 {
  margin: 0 0 0.42rem;
  font-size: 0.9rem;
}

.help-doc-panel p {
  margin: 0;
  color: var(--text-soft);
  line-height: 1.5;
}

.help-doc-panel ul {
  margin: 0;
  padding-left: 1.05rem;
  color: var(--text-soft);
}

.help-doc-panel li + li {
  margin-top: 0.3rem;
}
</style>
