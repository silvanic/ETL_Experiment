<script setup lang="ts">
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'
import type { SavedPipelineSummary } from '@/modules/pipeline/services/pipelineStorage'

interface Props {
  visible: boolean
  savedPipelines: SavedPipelineSummary[]
  selectedSavedPipelineId: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:selectedSavedPipelineId': [value: string | null]
  'load-selected': []
}>()

const { t } = useI18n()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const hasSavedPipelines = computed(() => props.savedPipelines.length > 0)

const selectedSavedPipeline = computed(() =>
  props.savedPipelines.find((item) => item.id === props.selectedSavedPipelineId) ?? null,
)

function selectPipeline(pipelineId: string): void {
  emit('update:selectedSavedPipelineId', pipelineId)
}

function loadSelectedPipeline(): void {
  emit('load-selected')
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="t('pipelineEditor.storage.loadDialogTitle')"
    :modal="true"
    style="width: min(720px, 94vw)"
  >
    <section class="load-dialog">
      <Message v-if="!hasSavedPipelines" severity="info" :closable="false">
        {{ t('pipelineEditor.storage.empty') }}
      </Message>

      <ul v-else class="saved-pipelines-list" role="listbox" :aria-label="t('pipelineEditor.storage.savedListLabel')">
        <li
          v-for="item in savedPipelines"
          :key="item.id"
          :class="['saved-pipeline-item', { 'saved-pipeline-item--active': item.id === selectedSavedPipelineId }]"
        >
          <button
            type="button"
            class="saved-pipeline-button"
            @click="selectPipeline(item.id)"
          >
            <span class="saved-pipeline-name">{{ item.name }}</span>
            <span class="saved-pipeline-date">{{ new Date(item.updatedAt).toLocaleString() }}</span>
          </button>
        </li>
      </ul>

      <div v-if="selectedSavedPipeline" class="saved-pipeline-preview">
        <p class="saved-pipeline-preview-label">{{ t('pipelineEditor.storage.selectedProject') }}</p>
        <p class="saved-pipeline-preview-name">{{ selectedSavedPipeline.name }}</p>
        <p class="saved-pipeline-preview-date">
          {{ t('pipelineEditor.storage.lastUpdate') }}: {{ new Date(selectedSavedPipeline.updatedAt).toLocaleString() }}
        </p>
      </div>

      <div class="load-dialog-actions">
        <Button
          :label="t('pipelineEditor.storage.loadConfirm')"
          icon="pi pi-check"
          :disabled="!selectedSavedPipelineId"
          @click="loadSelectedPipeline"
        />
      </div>
    </section>
  </Dialog>
</template>

<style scoped>
.load-dialog {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.saved-pipelines-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.45rem;
  max-height: 44vh;
  overflow: auto;
}

.saved-pipeline-item {
  border: 1px solid var(--border);
  border-radius: 10px;
}

.saved-pipeline-item--active {
  border-color: var(--primary-color, #0ea5e9);
  box-shadow: 0 0 0 1px var(--primary-color, #0ea5e9) inset;
}

.saved-pipeline-button {
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: center;
  padding: 0.65rem 0.75rem;
  cursor: pointer;
}

.saved-pipeline-name {
  font-weight: 600;
}

.saved-pipeline-date {
  font-size: 0.8rem;
  color: var(--text-soft);
}

.saved-pipeline-preview {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
}

.saved-pipeline-preview-label {
  margin: 0;
  font-size: 0.76rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.saved-pipeline-preview-name {
  margin: 0.3rem 0 0;
  font-weight: 700;
}

.saved-pipeline-preview-date {
  margin: 0.15rem 0 0;
  font-size: 0.82rem;
  color: var(--text-soft);
}

.load-dialog-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
