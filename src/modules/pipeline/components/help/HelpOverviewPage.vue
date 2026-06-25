<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import HelpFaqSection from '@/modules/pipeline/components/help/HelpFaqSection.vue'
import { helpNodeKeys } from '@/modules/pipeline/components/help/helpDocData'

const { t, locale } = useI18n()

const overviewLabel = computed(() => locale.value === 'fr' ? 'Vue d\'ensemble' : 'Overview')
const faqItems = computed(() => [
  {
    question: 'Par quoi commencer quand on decouvre l outil ?',
    answer: 'Commencez par la section des noeuds de base (Start, API, Transform, Output), puis ouvrez les exemples guides.',
  },
  {
    question: 'Combien de temps faut-il pour prendre en main ?',
    answer: 'En general 20 a 30 minutes suffisent pour realiser un premier pipeline simple.',
  },
  {
    question: 'Quand utiliser les exemples ?',
    answer: 'Utilisez-les comme base de regression ou de demarrage quand vous creez un nouveau flux.',
  },
])
</script>

<template>
  <article class="doc-page">
    <h2>{{ overviewLabel }}</h2>
    <p class="doc-lead">{{ t('pipelineEditor.help.title') }}</p>

    <section class="doc-section">
      <h3>Parcours recommande</h3>
      <ol class="doc-path">
        <li>Commencer par les noeuds Start, API, Transform et Output.</li>
        <li>Passer ensuite aux noeuds Condition et Filter pour la logique metier.</li>
        <li>Terminer par les exemples guides pour valider le flux de bout en bout.</li>
      </ol>
    </section>

    <section class="doc-section">
      <h3>{{ t('pipelineEditor.help.section1Title') }}</h3>
      <ul>
        <li v-for="nodeKey in helpNodeKeys" :key="nodeKey">
          <RouterLink :to="{ name: 'help-node', params: { nodeKey } }">
            {{ t(`pipelineEditor.help.nodes.${nodeKey}.title`) }}
          </RouterLink>
        </li>
      </ul>
    </section>

    <section class="doc-section">
      <h3>{{ t('pipelineEditor.help.section2Title') }}</h3>
      <ul>
        <li>
          <RouterLink :to="{ name: 'help-example', params: { exampleId: 'request-condition-transform' } }">{{ t('pipelineEditor.help.example1Title') }}</RouterLink>
        </li>
        <li>
          <RouterLink :to="{ name: 'help-example', params: { exampleId: 'list-wildcard-transform' } }">{{ t('pipelineEditor.help.example2Title') }}</RouterLink>
        </li>
        <li>
          <RouterLink :to="{ name: 'help-example', params: { exampleId: 'dummyjson-auth-profile' } }">{{ t('pipelineEditor.help.example3Title') }}</RouterLink>
        </li>
      </ul>
    </section>

    <section class="doc-section">
      <h3>{{ t('pipelineEditor.help.section3Title') }}</h3>
      <ul>
        <li>
          <RouterLink :to="{ name: 'help-condition-array' }">{{ t('pipelineEditor.help.section3Title') }}</RouterLink>
        </li>
      </ul>
    </section>

    <section class="doc-section">
      <h3>Ce que vous allez gagner</h3>
      <ul>
        <li>Un pipeline plus lisible pour l equipe.</li>
        <li>Des chemins de donnees plus robustes et plus faciles a debugger.</li>
        <li>Des executions plus previsibles en pre-production et production.</li>
      </ul>
    </section>

    <HelpFaqSection :items="faqItems" />
  </article>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.doc-page h2 {
  margin: 0;
  font-size: 1.2rem;
}

.doc-lead {
  margin: 0;
  color: var(--text-soft);
}

.doc-section {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.8rem;
  background: var(--panel);
}

.doc-section h3 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
}

.doc-section ul {
  margin: 0;
  padding-left: 1.1rem;
}

.doc-section li + li {
  margin-top: 0.3rem;
}

.doc-path {
  margin: 0;
  padding-left: 1.1rem;
  color: var(--text-soft);
}

.doc-path li + li {
  margin-top: 0.35rem;
}
</style>
