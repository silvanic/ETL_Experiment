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
import Dialog from 'primevue/dialog'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Tag from 'primevue/tag'
import Badge from 'primevue/badge'
import type { MenuItem } from 'primevue/menuitem'
import { useI18n } from 'vue-i18n'
import type { ExecutionRun } from '@/modules/pipeline/domain/types'
import changelogFr from '@/modules/pipeline/data/changelog_fr.json'
import changelogEn from '@/modules/pipeline/data/changelog_en.json'

const store = usePipelineEditorStore()
const activeTab = ref('flow')
const showSettingsDialog = ref(false)
const showHelpDialog = ref(false)
const showRunDialog = ref(false)
const showLoadDialog = ref(false)
const showRenameDialog = ref(false)
const showWhatsNewDialog = ref(false)
const importFileInput = ref<HTMLInputElement | null>(null)
const selectedRunId = ref<string | null>(null)
const selectedSavedPipelineId = ref<string | null>(null)
const draftPipelineName = ref('')
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

const releaseHistory = computed(() => {
  const changelog = locale.value === 'fr' ? changelogFr : changelogEn
  return Object.entries(changelog)
    .map(([version, data]) => ({
      version,
      date: data.date,
      sections: data.sections
    }))
})

const menuItems = computed<MenuItem[]>(() => [
  {
    label: t('pipelineEditor.whatsNew.menuLabel'),
    icon: 'pi pi-megaphone',
    command: () => showWhatsNewDialog.value = true
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
        label: t('pipelineEditor.whatsNew.menuLabel'),
        icon: 'pi pi-megaphone',
        command: () => showWhatsNewDialog.value = true
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

function openRenameDialog(): void {
  draftPipelineName.value = store.pipeline.name
  showRenameDialog.value = true
}

function applyPipelineName(): void {
  const nextName = draftPipelineName.value.trim()
  if (!nextName) {
    return
  }

  store.renamePipeline(nextName)
  showRenameDialog.value = false
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

    <Menubar :key="menubarKey" :model="menuItems" class="toolbar-menubar">
      <template #start>
        <div class="title-group title-group--inline">
          <p class="eyebrow">{{ t('pipelineEditor.eyebrow') }}</p>
          <Badge>BETA</Badge>
          <span class="title-separator" aria-hidden="true" />
          <span class="pipeline-name-display pipeline-name-chip">{{ store.pipeline.name }}</span>
          <Button
            icon="pi pi-pencil"
            severity="secondary"
            text
            rounded
            :aria-label="t('pipelineEditor.renameDialog.open')"
            v-tooltip.right="t('pipelineEditor.renameDialog.open')"
            @click="openRenameDialog"
          />
          <span class="title-separator" aria-hidden="true" />
        </div>
      </template>
      <template #end>
        <div class="title-group title-group--inline">

          <Button
          :label="t('pipelineEditor.menu.runPipeline')"
          icon="pi pi-play"
          severity="primary"
          outlined
          @click="() => store.runCurrentPipeline()"
          />
        <Button
          :label="languageLabel"
          :aria-label="switchLanguageLabel"
          v-tooltip.right="switchLanguageLabel"
          icon="pi pi-language"
          severity="primary"
          outlined
          @click="toggleLanguage"
          />
        </div>
      </template>
    </Menubar>

    <Dialog
      v-model:visible="showRenameDialog"
      :header="t('pipelineEditor.renameDialog.title')"
      :modal="true"
      style="width: min(520px, 92vw)"
    >
      <div class="rename-dialog-body">
        <label class="rename-label" for="pipeline-name-input">
          {{ t('pipelineEditor.renameDialog.nameLabel') }}
        </label>
        <InputText
          id="pipeline-name-input"
          :model-value="draftPipelineName"
          autocomplete="off"
          @update:model-value="draftPipelineName = String($event)"
          @keyup.enter="applyPipelineName"
        />
      </div>
      <template #footer>
        <Button
          :label="t('pipelineEditor.renameDialog.cancel')"
          text
          @click="showRenameDialog = false"
        />
        <Button
          :label="t('pipelineEditor.renameDialog.save')"
          :disabled="draftPipelineName.trim().length === 0"
          @click="applyPipelineName"
        />
      </template>
    </Dialog>

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

    <Dialog
      v-model:visible="showWhatsNewDialog"
      :header="t('pipelineEditor.whatsNew.title')"
      :modal="true"
      style="width: min(760px, 96vw)"
    >
      <div class="whats-new-dialog">
        <p class="whats-new-intro">{{ t('pipelineEditor.whatsNew.intro') }}</p>

        <ul class="whats-new-list">
          <li
            v-for="release in releaseHistory"
            :key="release.version"
            class="whats-new-item"
          >
            <div class="whats-new-item-head">
              <Tag :value="release.version" severity="contrast" />
              <span class="whats-new-date">{{ release.date }}</span>
            </div>
            
            <div 
              v-for="section in release.sections"
              :key="section.title"
              class="whats-new-section"
            >
              <h5 class="whats-new-section-title">{{ section.title }}</h5>
              <ul class="whats-new-features">
                <li
                  v-for="feature in section.features"
                  :key="feature"
                >
                  {{ feature }}
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </div>
    </Dialog>

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

.toolbar-menubar {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow);
  padding: 0.6rem 0.8rem;
}

.toolbar-menubar :deep(.p-menubar) {
  border: 0;
  background: transparent;
  padding: 0;
  gap: 0.75rem;
}

.toolbar-menubar :deep(.p-menubar-start),
.toolbar-menubar :deep(.p-menubar-end) {
  display: flex;
  align-items: center;
}

.title-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.title-group--inline {
  flex-direction: row;
  align-items: center;
  gap: 0.55rem;
}

.eyebrow {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.title-separator {
  width: 1px;
  height: 1.2rem;
  background: var(--border);
  opacity: 0.9;
}

.pipeline-name-display {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text);
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pipeline-name-chip {
  padding: 0.2rem 0.55rem;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--border) 75%, transparent);
}

.rename-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.rename-label {
  font-size: 0.86rem;
  color: var(--text-soft);
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

.whats-new-dialog {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.whats-new-intro {
  margin: 0;
  color: var(--text-soft);
}

.whats-new-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.7rem;
}

.whats-new-item {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.8rem;
  background: color-mix(in srgb, var(--panel) 86%, transparent);
}

.whats-new-item-head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.6rem;
}

.whats-new-date {
  font-size: 0.82rem;
  color: var(--text-soft);
}

.whats-new-section {
  margin-top: 0.6rem;
}

.whats-new-section:first-child {
  margin-top: 0;
}

.whats-new-section-title {
  margin: 0 0 0.35rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
}

.whats-new-features {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.3rem;
}

.whats-new-features li {
  color: var(--text-soft);
  font-size: 0.86rem;
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

  .toolbar-menubar :deep(.p-menubar) {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .title-group--inline {
    width: 100%;
    flex-wrap: wrap;
  }

  .title-separator {
    display: none;
  }

  .pipeline-name-display {
    max-width: 100%;
  }

  .run-history-count {
    margin-left: 0;
  }
}
</style>
