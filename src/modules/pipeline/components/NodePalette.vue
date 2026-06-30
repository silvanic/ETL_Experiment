<script setup lang="ts">
import { computed } from 'vue'
import { usePipelineEditorStore } from '@/modules/pipeline/stores/pipelineEditorStore'
import type { NodeType } from '@/modules/pipeline/domain/types'
import Panel from 'primevue/panel'
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'

const store = usePipelineEditorStore()
const { t } = useI18n()

const entries = computed<{ type: NodeType; title: string; subtitle: string }[]>(() => [
  {
    type: 'start',
    title: t('nodePalette.nodes.start.title'),
    subtitle: t('nodePalette.nodes.start.subtitle'),
  },
  {
    type: 'api',
    title: t('nodePalette.nodes.api.title'),
    subtitle: `${t('nodePalette.nodes.api.subtitle')} · ${t('nodePalette.nodes.api.retry')}`,
  },
  {
    type: 'setVariable',
    title: t('nodePalette.nodes.setVariable.title'),
    subtitle: t('nodePalette.nodes.setVariable.subtitle'),
  },
  {
    type: 'condition',
    title: t('nodePalette.nodes.condition.title'),
    subtitle: t('nodePalette.nodes.condition.subtitle'),
  },
  {
    type: 'filter',
    title: t('nodePalette.nodes.filter.title'),
    subtitle: t('nodePalette.nodes.filter.subtitle'),
  },
  {
    type: 'transform',
    title: t('nodePalette.nodes.transform.title'),
    subtitle: t('nodePalette.nodes.transform.subtitle'),
  },
  {
    type: 'map',
    title: t('nodePalette.nodes.map.title'),
    subtitle: t('nodePalette.nodes.map.subtitle'),
  },
  {
    type: 'iterate',
    title: t('nodePalette.nodes.iterate.title'),
    subtitle: t('nodePalette.nodes.iterate.subtitle'),
  },
  {
    type: 'subflow',
    title: t('nodePalette.nodes.subflow.title'),
    subtitle: t('nodePalette.nodes.subflow.subtitle'),
  },
  {
    type: 'output',
    title: t('nodePalette.nodes.output.title'),
    subtitle: t('nodePalette.nodes.output.subtitle'),
  },
])

function nodeButtonClass(type: NodeType): string[] {
  if (type === 'iterate') {
    return ['node-button', 'node-button-iterate']
  }

  if (type === 'subflow') {
    return ['node-button', 'node-button-subflow']
  }

  return ['node-button']
}
</script>

<template>
  <Panel class="panel">
    <template #header>
      <h2>{{ t('nodePalette.title') }}</h2>
    </template>

    <header>
      <p>{{ t('nodePalette.description') }}</p>
    </header>

    <ul>
      <li v-for="entry in entries" :key="entry.type">
        <Button :class="nodeButtonClass(entry.type)" severity="secondary" outlined @click="store.addNodeByType(entry.type)">
          <span class="node-button-content">
            <strong>{{ entry.title }}</strong>
            <span>{{ entry.subtitle }}</span>
          </span>
        </Button>
      </li>
    </ul>
  </Panel>
</template>

<style scoped>
.panel {
  height: 100%;
}

h2 {
  margin: 0;
  font-size: 1rem;
}

p {
  margin: 0.35rem 0 1rem;
  color: var(--text-soft);
  font-size: 0.9rem;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.55rem;
}

button {
  width: 100%;
}

.node-button {
  width: 100%;
  justify-content: flex-start;
}

.node-button-iterate {
  --container-accent: var(--flow-iterate-border);
  --container-accent-soft: var(--flow-iterate-soft);
}

.node-button-subflow {
  --container-accent: var(--flow-subflow-border);
  --container-accent-soft: var(--flow-subflow-soft);
}

.node-button-iterate,
.node-button-subflow {
  border-color: var(--container-accent) !important;
  background: linear-gradient(180deg, var(--container-accent-soft), rgba(15, 23, 42, 0.08)) !important;
}

.node-button-iterate strong {
  color: var(--flow-iterate-text);
}

.node-button-subflow strong {
  color: var(--flow-subflow-text);
}

.node-button-iterate :deep(.p-button-label),
.node-button-subflow :deep(.p-button-label) {
  width: 100%;
}

strong {
  font-size: 0.92rem;
}

span {
  font-size: 0.8rem;
  color: var(--text-soft);
}

.node-button-content {
  display: grid;
  text-align: left;
  gap: 0.15rem;
}
</style>
