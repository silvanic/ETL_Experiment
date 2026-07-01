<script setup lang="ts">
import { computed, ref } from 'vue'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Button from 'primevue/button'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Checkbox from 'primevue/checkbox'
import { useConfirm } from 'primevue/useconfirm'
import { useI18n } from 'vue-i18n'
import type { SavedPipelineSummary } from '@/modules/pipeline/services/pipelineStorage'
import { pipelineTemplates } from '@/modules/pipeline/data/templates'

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
  'load-template': [templateId: string]
  'delete-pipelines': [pipelineIds: string[]]
}>()

const { t } = useI18n()
const confirm = useConfirm()
const activeTab = ref('saved')
const selectedPipelineIds = ref(new Set<string>())

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const hasSavedPipelines = computed(() => props.savedPipelines.length > 0)

const selectedSavedPipeline = computed(() =>
  props.savedPipelines.find((item) => item.id === props.selectedSavedPipelineId) ?? null,
)

const selectedCount = computed(() => selectedPipelineIds.value.size)
const allSelected = computed(() => selectedCount.value === props.savedPipelines.length && hasSavedPipelines.value)

function selectPipeline(pipelineId: string): void {
  emit('update:selectedSavedPipelineId', pipelineId)
}

function togglePipelineSelection(pipelineId: string): void {
  if (selectedPipelineIds.value.has(pipelineId)) {
    selectedPipelineIds.value.delete(pipelineId)
  } else {
    selectedPipelineIds.value.add(pipelineId)
  }
}

function toggleAllPipelines(): void {
  if (allSelected.value) {
    selectedPipelineIds.value.clear()
  } else {
    selectedPipelineIds.value = new Set(props.savedPipelines.map((p) => p.id))
  }
}

function loadSelectedPipeline(): void {
  emit('load-selected')
}

function loadTemplate(templateId: string): void {
  emit('load-template', templateId)
}

function deleteSelected(): void {
  if (selectedPipelineIds.value.size === 0) return
  const count = selectedPipelineIds.value.size
  const message = count === 1
    ? t('pipelineEditor.storage.confirmDeleteOne')
    : t('pipelineEditor.storage.confirmDeleteMultiple', { count })
  
  confirm.require({
    message,
    header: t('pipelineEditor.storage.delete'),
    acceptLabel: t('common.yes'),
    rejectLabel: t('common.no'),
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      emit('delete-pipelines', Array.from(selectedPipelineIds.value))
      selectedPipelineIds.value.clear()
    },
  })
}

function deleteAll(): void {
  if (!hasSavedPipelines.value) return
  const message = t('pipelineEditor.storage.confirmDeleteAll', { count: props.savedPipelines.length })
  
  confirm.require({
    message,
    header: t('pipelineEditor.storage.deleteAll'),
    acceptLabel: t('common.yes'),
    rejectLabel: t('common.no'),
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      emit('delete-pipelines', props.savedPipelines.map((p) => p.id))
      selectedPipelineIds.value.clear()
    },
  })
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="t('pipelineEditor.storage.loadDialogTitle')"
    :modal="true"
    style="width: min(720px, 94vw)"
  >
    <Tabs v-model:value="activeTab" class="load-dialog-tabs">
      <TabList>
        <Tab value="saved">{{ t('pipelineEditor.templates.tabSaved') }}</Tab>
        <Tab value="templates">{{ t('pipelineEditor.templates.tabTemplates') }}</Tab>
      </TabList>

      <TabPanels>
        <!-- ── Onglet Mes projets ── -->
        <TabPanel value="saved">
          <section class="load-dialog">
            <Message v-if="!hasSavedPipelines" severity="info" :closable="false">
              {{ t('pipelineEditor.storage.empty') }}
            </Message>

            <div v-else class="saved-pipelines-section">
              <!-- Barre de selection + actions de gestion -->
              <div class="selection-management-bar">
                <div class="selection-control">
                  <label class="checkbox-label">
                    <Checkbox 
                      :model-value="allSelected" 
                      binary 
                      @update:model-value="toggleAllPipelines"
                    />
                    <span v-if="selectedCount === 0">{{ t('pipelineEditor.storage.selectAll') }}</span>
                    <span v-else>{{ selectedCount }} / {{ savedPipelines.length }} {{ t('pipelineEditor.storage.selected') }}</span>
                  </label>
                </div>
                <div class="management-actions">
                  <Button
                    v-if="selectedCount > 0"
                    :label="t('pipelineEditor.storage.delete')"
                    icon="pi pi-trash"
                    severity="danger"
                    text
                    size="small"
                    @click="deleteSelected"
                  />
                  <Button
                    v-if="hasSavedPipelines"
                    :label="t('pipelineEditor.storage.deleteAll')"
                    icon="pi pi-times"
                    severity="danger"
                    text
                    size="small"
                    @click="deleteAll"
                  />
                </div>
              </div>

              <!-- ── Liste des pipelines ── -->
              <ul class="saved-pipelines-list" role="listbox" :aria-label="t('pipelineEditor.storage.savedListLabel')">
                <li
                  v-for="item in savedPipelines"
                  :key="item.id"
                  :class="['saved-pipeline-item', { 'saved-pipeline-item--active': item.id === selectedSavedPipelineId }]"
                >
                  <div class="saved-pipeline-row">
                    <Checkbox 
                      :model-value="selectedPipelineIds.has(item.id)"
                      binary
                      @update:model-value="togglePipelineSelection(item.id)"
                    />
                    <button
                      type="button"
                      class="saved-pipeline-button"
                      @click="selectPipeline(item.id)"
                    >
                      <span class="saved-pipeline-name">{{ item.name }}</span>
                      <span class="saved-pipeline-date">{{ new Date(item.updatedAt).toLocaleString() }}</span>
                    </button>
                  </div>
                </li>
              </ul>

              <div v-if="selectedSavedPipeline" class="saved-pipeline-preview">
                <p class="saved-pipeline-preview-label">{{ t('pipelineEditor.storage.selectedProject') }}</p>
                <p class="saved-pipeline-preview-name">{{ selectedSavedPipeline.name }}</p>
                <p class="saved-pipeline-preview-date">
                  {{ t('pipelineEditor.storage.lastUpdate') }}: {{ new Date(selectedSavedPipeline.updatedAt).toLocaleString() }}
                </p>
              </div>

              <!-- Actions de chargement -->
              <div class="load-dialog-actions">
                <Button
                  :label="t('pipelineEditor.storage.loadConfirm')"
                  icon="pi pi-check"
                  :disabled="!selectedSavedPipelineId"
                  @click="loadSelectedPipeline"
                />
              </div>
            </div>
          </section>
        </TabPanel>

        <!-- ── Onglet Modèles ── -->
        <TabPanel value="templates">
          <section class="templates-panel">
            <p class="templates-intro">{{ t('pipelineEditor.templates.intro') }}</p>
            <ul class="templates-list">
              <li v-for="tpl in pipelineTemplates" :key="tpl.id" class="template-card">
                <span class="template-icon" aria-hidden="true">{{ tpl.icon }}</span>
                <div class="template-body">
                  <strong class="template-name">{{ t(tpl.nameKey) }}</strong>
                  <span class="template-description">{{ t(tpl.descriptionKey) }}</span>
                </div>
                <Button
                  :label="t('pipelineEditor.templates.use')"
                  icon="pi pi-play"
                  size="small"
                  @click="loadTemplate(tpl.id)"
                />
              </li>
            </ul>
          </section>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </Dialog>
</template>

<style scoped>
.load-dialog-tabs {
  margin-top: -0.5rem;
}

.load-dialog {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding-top: 0.75rem;
}

.saved-pipelines-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.selection-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--panel-soft);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.95rem;
  user-select: none;
}

.selection-management-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--panel-soft);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.selection-control {
  display: flex;
  align-items: center;
  flex: 1;
}

.management-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
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

.saved-pipeline-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.5rem;
}

.saved-pipeline-button {
  flex: 1;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: center;
  padding: 0.2rem 0.25rem;
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
  justify-content: flex-start;
  gap: 0.5rem;
}

/* Templates panel */
.templates-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.75rem;
}

.templates-intro {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-soft);
}

.templates-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
  max-height: 42vh;
  overflow: auto;
}

.template-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.7rem 0.9rem;
}

.template-icon {
  font-size: 1.6rem;
  line-height: 1;
  flex-shrink: 0;
}

.template-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.template-name {
  font-size: 0.95rem;
}

.template-description {
  font-size: 0.82rem;
  color: var(--text-soft);
}
</style>
