<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { t, locale } = useI18n()

interface Crumb {
  label: string
  to?: { name: string; params?: Record<string, string> }
}

const overviewLabel = computed(() => locale.value === 'fr' ? 'Vue d\'ensemble' : 'Overview')

function resolveExampleLabel(exampleId: string): string {
  if (exampleId === 'request-condition-transform' || exampleId === 'example1') {
    return t('pipelineEditor.help.example1Title')
  }

  if (exampleId === 'list-wildcard-transform' || exampleId === 'example2') {
    return t('pipelineEditor.help.example2Title')
  }

  if (exampleId === 'dummyjson-auth-profile' || exampleId === 'example3') {
    return t('pipelineEditor.help.example3Title')
  }

  return t('pipelineEditor.help.section2Title')
}

const crumbs = computed<Crumb[]>(() => {
  const list: Crumb[] = [
    { label: t('pipelineEditor.help.title'), to: { name: 'help-overview' } },
  ]

  if (route.name === 'help-overview') {
    list.push({ label: overviewLabel.value })
    return list
  }

  if (route.name === 'help-node') {
    const nodeKey = String(route.params.nodeKey ?? '')
    list.push({ label: t('pipelineEditor.help.section1Title') })
    list.push({ label: t(`pipelineEditor.help.nodes.${nodeKey}.title`) })
    return list
  }

  if (route.name === 'help-example') {
    const exampleId = String(route.params.exampleId ?? '')
    list.push({ label: t('pipelineEditor.help.section2Title') })
    list.push({ label: resolveExampleLabel(exampleId) })
    return list
  }

  if (route.name === 'help-condition-array') {
    list.push({ label: t('pipelineEditor.help.section3Title') })
    return list
  }

  if (route.name === 'help-concepts') {
    list.push({ label: t('pipelineEditor.help.guidesTitle') })
    list.push({ label: t('pipelineEditor.help.concepts.navTitle') })
    return list
  }

  return list
})
</script>

<template>
  <nav class="help-breadcrumb" aria-label="Fil d ariane">
    <ol>
      <li v-for="(crumb, index) in crumbs" :key="`${crumb.label}-${index}`">
        <RouterLink v-if="crumb.to && index < crumbs.length - 1" :to="crumb.to">{{ crumb.label }}</RouterLink>
        <span v-else>{{ crumb.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.help-breadcrumb ol {
  margin: 0 0 0.65rem;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  color: var(--text-soft);
  font-size: 0.8rem;
}

.help-breadcrumb li {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.help-breadcrumb li + li::before {
  content: '/';
  color: var(--text-soft);
}

.help-breadcrumb a {
  color: var(--text-soft);
  text-decoration: none;
}

.help-breadcrumb a:hover {
  color: var(--text);
  text-decoration: underline;
}
</style>
