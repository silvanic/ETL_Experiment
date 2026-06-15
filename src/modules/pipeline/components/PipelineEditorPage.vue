<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import NodePalette from '@/modules/pipeline/components/NodePalette.vue'
import PipelineCanvas from '@/modules/pipeline/components/PipelineCanvas.vue'
import InspectorPanel from '@/modules/pipeline/components/InspectorPanel.vue'
import RunConsole from '@/modules/pipeline/components/RunConsole.vue'
import PipelineSettingsDialog from '@/modules/pipeline/components/dialogs/DialogPipelineSettings.vue'
import PipelineHelpDialog from '@/modules/pipeline/components/dialogs/DialogPipelineHelp.vue'
import PipelineLoadDialog from '@/modules/pipeline/components/dialogs/DialogPipelineLoad.vue'
import PipelineRunDialog from '@/modules/pipeline/components/dialogs/DialogPipelineRun.vue'
import { usePipelineEditorStore } from '@/modules/pipeline/stores/pipelineEditorStore'
import { setLocale, type AppLocale } from '@/i18n'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Menubar from 'primevue/menubar'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Tag from 'primevue/tag'
import type { MenuItem } from 'primevue/menuitem'
import { useI18n } from 'vue-i18n'
import type { ExecutionRun } from '@/modules/pipeline/domain/types'

const store = usePipelineEditorStore()
const activeTab = ref('flow')
const showSettingsDialog = ref(false)
const showHelpDialog = ref(false)
const showRunDialog = ref(false)
const showLoadDialog = ref(false)
const importFileInput = ref<HTMLInputElement | null>(null)
const selectedRunId = ref<string | null>(null)
const selectedSavedPipelineId = ref<string | null>(null)
const autoOpenConsoleOnRunEndStorageKey = 'pipeline.editor.autoOpenConsoleOnRunEnd'
const autoOpenConsoleOnRunEnd = ref(localStorage.getItem(autoOpenConsoleOnRunEndStorageKey) === 'true' || true)
const { t, locale } = useI18n()

const languageLabel = computed(() =>
  locale.value === 'fr'
    ? t('pipelineEditor.language.currentFr')
    : t('pipelineEditor.language.currentEn'),
)

const switchLanguageLabel = computed(() =>
  locale.value === 'fr'
    ? t('pipelineEditor.language.switchToEn')
    : t('pipelineEditor.language.switchToFr'),
)

const menuItems = computed<MenuItem[]>(() => [
  {
    label: t('pipelineEditor.menu.runPipeline'),
    command: () => store.runCurrentPipeline(),
    icon: 'pi pi-play',
  },
  {
    label: t('pipelineEditor.help.menuLabel'),
    icon: 'pi pi-question-circle',
    command: () => showHelpDialog.value = true
  },
  {
    label: t('pipelineEditor.menu.actions'),
    items: [
      {
        icon: 'pi pi-play',
        label: store.isRunning ? t('pipelineEditor.menu.running') : t('pipelineEditor.menu.runPipeline'),
        command: () => store.runCurrentPipeline(),
        disabled: store.isRunning
      },
      {
        label: t('pipelineEditor.menu.newPipeline'),
        icon: 'pi pi-file',
        command: () => store.resetPipeline()
      },
      {
        label: t('pipelineEditor.menu.save'),
        icon: 'pi pi-save',
        command: () => saveCurrentPipeline(),
      },
      {
        label: t('pipelineEditor.menu.load'),
        icon: 'pi pi-folder-open',
        command: () => openLoadDialog(),
      },
      {
        label: t('pipelineEditor.menu.export'),
        icon: 'pi pi-download',
        command: () => exportCurrentPipeline(),
      },
      {
        label: t('pipelineEditor.menu.import'),
        icon: 'pi pi-upload',
        command: () => triggerImportPipeline(),
      },
      {
        separator: true
      },
      {
        label: t('pipelineEditor.menu.settings'),
        icon: 'pi pi-cog',
        command: () => showSettingsDialog.value = true
      },
      {
        separator: true
      },
      {
        label: t('pipelineEditor.help.menuLabel'),
        icon: 'pi pi-question-circle',
        command: () => showHelpDialog.value = true
      },
    ]
  }
])

const menubarKey = computed(() => `${locale.value}-${store.isRunning ? 'running' : 'idle'}`)
const lastRuns = computed<ExecutionRun[]>(() => store.runHistory.slice(0, 3))
const selectedRun = computed<ExecutionRun | null>(() =>
  store.runHistory.find((run) => run.id === selectedRunId.value) ?? null,
)

function addVariable(name: string, value: string): void {
  store.addVariable(name, value)
}

function updateVariableName(variableId: string, value: string): void {
  store.updateVariable(variableId, { name: value })
}

function updateVariableValue(variableId: string, value: string): void {
  store.updateVariable(variableId, { value })
}

function removeVariable(variableId: string): void {
  store.removeVariable(variableId)
}

function toggleLanguage(): void {
  const nextLocale: AppLocale = locale.value === 'fr' ? 'en' : 'fr'
  setLocale(nextLocale)
  store.relocalizePipelineLabels()
}

function openRunDialog(runId: string): void {
  selectedRunId.value = runId
  showRunDialog.value = true
}

function sanitizeFileName(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '-')
  const safe = normalized.replace(/[^a-z0-9_-]/g, '')
  return safe || 'pipeline'
}

function exportCurrentPipeline(): void {
  const json = store.exportCurrentPipeline()
  const fileName = `${sanitizeFileName(store.pipeline.name)}.json`
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function triggerImportPipeline(): void {
  importFileInput.value?.click()
}

async function handleImportFileChange(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.[0]
  if (!file) {
    return
  }

  try {
    const raw = await file.text()
    store.importPipelineFromJson(raw)
  } finally {
    if (target) {
      target.value = ''
    }
  }
}

function saveCurrentPipeline(): void {
  store.saveCurrentPipeline()
}

function openLoadDialog(): void {
  store.refreshSavedPipelines()
  selectedSavedPipelineId.value = store.savedPipelines[0]?.id ?? null
  showLoadDialog.value = true
}

function loadSelectedPipeline(): void {
  if (!selectedSavedPipelineId.value) {
    return
  }

  const loaded = store.loadPipelineById(selectedSavedPipelineId.value)
  if (loaded) {
    showLoadDialog.value = false
  }
}

watch(autoOpenConsoleOnRunEnd, (enabled) => {
  localStorage.setItem(autoOpenConsoleOnRunEndStorageKey, String(enabled))
})

watch(
  () => store.isRunning,
  (isRunning, wasRunning) => {
    if (wasRunning && !isRunning && autoOpenConsoleOnRunEnd.value) {
      activeTab.value = 'console'
    }
  },
)

store.relocalizePipelineLabels()
</script>

<template>
  <main class="page">
    <input
      ref="importFileInput"
      type="file"
      accept="application/json,.json"
      class="visually-hidden"
      @change="handleImportFileChange"
    />

    <header class="toolbar">
      <div class="title-group">
        <p class="eyebrow">{{ t('pipelineEditor.eyebrow') }}</p>
        <InputText
          class="pipeline-name"
          :model-value="store.pipeline.name"
          @update:model-value="store.renamePipeline(String($event))"
        />
      </div>

      <Menubar :key="menubarKey" :model="menuItems">
        <template #end>
          <Button
            :label="languageLabel"
            :aria-label="switchLanguageLabel"
            icon="pi pi-language"
            severity="primary"
            outlined
            @click="toggleLanguage"
          />
        </template>
      </Menubar>
    </header>

    <PipelineSettingsDialog
      v-model:visible="showSettingsDialog"
      v-model:auto-open-console-on-run-end="autoOpenConsoleOnRunEnd"
      :variables="store.pipeline.variables"
      @add-variable="addVariable"
      @update-variable-name="updateVariableName"
      @update-variable-value="updateVariableValue"
      @remove-variable="removeVariable"
    />

    <PipelineHelpDialog
      v-model:visible="showHelpDialog"
    />

    <PipelineLoadDialog
      v-model:visible="showLoadDialog"
      v-model:selected-saved-pipeline-id="selectedSavedPipelineId"
      :saved-pipelines="store.savedPipelines"
      @load-selected="loadSelectedPipeline"
    />

    <PipelineRunDialog
      v-model:visible="showRunDialog"
      :logs="selectedRun?.logs ?? []"
    />

    <Tabs v-model:value="activeTab" class="workspace-tabs">
      <TabList>
        <Tab value="flow">{{ t('pipelineEditor.tabs.flow') }}</Tab>
        <Tab value="console">{{ t('pipelineEditor.tabs.console') }}</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="flow">
          <section class="workspace-grid">
            <NodePalette />
            <PipelineCanvas />
            <InspectorPanel />
          </section>
          <section class="run-history" aria-label="run-history">
            <div class="run-history-header">
              <h3>{{ t('pipelineEditor.history.title') }}</h3>
            </div>

            <Message v-if="lastRuns.length === 0" severity="info" :closable="false">
              {{ t('pipelineEditor.history.empty') }}
            </Message>

            <ul v-else class="run-history-list">
              <li v-for="run in lastRuns" :key="run.id" class="run-history-item">
                <div class="run-history-item-head">
                  <Tag
                    :value="run.success ? t('pipelineEditor.history.success') : t('pipelineEditor.history.error')"
                    :severity="run.success ? 'success' : 'danger'"
                  />
                  <span class="run-history-time">{{ new Date(run.finishedAt).toLocaleString() }}</span>
                  <span class="run-history-count">{{ t('pipelineEditor.history.eventCount', { count: run.logs.length }) }}</span>
                  <Button
                    icon="pi pi-window-maximize"
                    severity="secondary"
                    outlined
                    :label="t('pipelineEditor.history.expand')"
                    @click="openRunDialog(run.id)"
                  />
                </div>
                <p v-if="run.errorMessage" class="run-history-error">{{ run.errorMessage }}</p>
              </li>
            </ul>
          </section>
        </TabPanel>
        <TabPanel value="console">
          <section class="console-view">
            <RunConsole />
          </section>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 1rem;
  padding: 1rem;
}

.toolbar {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow);
  padding: 0.9rem 1rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.title-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.eyebrow {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.pipeline-name {
  min-width: 260px;
}

.toolbar-actions {
  display: flex;
  gap: 0.6rem;
}

.workspace-tabs {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.workspace-grid {
  min-height: 56vh;
  display: grid;
  gap: 0.9rem;
  grid-template-columns: 220px 1fr 320px;
}

.run-history {
  margin-top: 0.9rem;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--panel);
  box-shadow: var(--shadow);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.run-history-header h3 {
  margin: 0;
  font-size: 0.95rem;
}

.run-history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
}

.run-history-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.65rem;
  background: var(--panel-soft);
}

.run-history-item-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.run-history-time {
  font-size: 0.8rem;
  color: var(--text-soft);
}

.run-history-count {
  font-size: 0.8rem;
  color: var(--text-soft);
  margin-left: auto;
}

.run-history-error {
  margin: 0.45rem 0 0;
  color: var(--danger);
  font-size: 0.82rem;
}

.run-history-dialog-body {
  min-height: 60vh;
}

.console-view {
  min-height: 56vh;
  display: flex;
  flex-direction: column;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 1100px) {
  .workspace-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto 58vh auto;
  }

  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .toolbar-menu {
    max-width: none;
  }

  .pipeline-name {
    min-width: 100%;
  }

  .run-history-count {
    margin-left: 0;
  }
}
</style>
