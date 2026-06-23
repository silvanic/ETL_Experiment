<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import NodePalette from '@/modules/pipeline/components/NodePalette.vue'
import PipelineCanvas from '@/modules/pipeline/components/PipelineCanvas.vue'
import InspectorPanel from '@/modules/pipeline/components/InspectorPanel.vue'
import RunConsole from '@/modules/pipeline/components/RunConsole.vue'
import PipelineSettingsDialog from '@/modules/pipeline/components/dialogs/DialogPipelineSettings.vue'
import PipelineHelpDialog from '@/modules/pipeline/components/dialogs/DialogPipelineHelp.vue'
import PipelineLoadDialog from '@/modules/pipeline/components/dialogs/DialogPipelineLoad.vue'
import AutoSaveIcon from '@/modules/pipeline/components/AutoSaveIcon.vue'
import { pipelineTemplates } from '@/modules/pipeline/data/templates'
import PipelineRunDialog from '@/modules/pipeline/components/dialogs/DialogPipelineRun.vue'
import { usePipelineEditorStore } from '@/modules/pipeline/stores/pipelineEditorStore'
import { setLocale, type AppLocale } from '@/i18n'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
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
import { isValidVariableName } from '@/modules/pipeline/domain/variables'
import changelogFr from '@/modules/pipeline/data/changelog_fr.json'
import changelogEn from '@/modules/pipeline/data/changelog_en.json'

const store = usePipelineEditorStore()
const activeTab = ref('flow')
const showSettingsDialog = ref(false)
const showHelpDialog = ref(false)
const showRunDialog = ref(false)
const showLoadDialog = ref(false)
const showCreateDialog = ref(false)
const showRenameDialog = ref(false)
const showWhatsNewDialog = ref(false)
const importFileInput = ref<HTMLInputElement | null>(null)
const selectedRunId = ref<string | null>(null)
const selectedSavedPipelineId = ref<string | null>(null)
const draftPipelineName = ref('')
const createPipelineName = ref('')
const selectedCreateSource = ref<'empty' | string>('empty')
const newTabVariableName = ref('')
const newTabVariableValue = ref('')
const tabVariableError = ref<string | null>(null)
const selectedTabVariableId = ref<string | null>(null)
const isAddingTabVariable = ref(false)
const autoOpenConsoleOnRunEndStorageKey = 'pipeline.editor.autoOpenConsoleOnRunEnd'
const autoSaveEnabledStorageKey = 'pipeline.editor.autoSaveEnabled'
const confirmDeleteNodeStorageKey = 'pipeline.editor.confirmDeleteNode'
const autoFitOnOpenStorageKey = 'pipeline.editor.autoFitOnOpen'
const reopenLastPipelineOnLaunchStorageKey = 'pipeline.editor.reopenLastPipelineOnLaunch'
const autoOpenConsoleOnRunEnd = ref(localStorage.getItem(autoOpenConsoleOnRunEndStorageKey) === 'true' || true)
const autoSaveEnabled = ref(localStorage.getItem(autoSaveEnabledStorageKey) !== 'false')
const confirmDeleteNode = ref(localStorage.getItem(confirmDeleteNodeStorageKey) !== 'false')
const autoFitOnOpen = ref(localStorage.getItem(autoFitOnOpenStorageKey) !== 'false')
const reopenLastPipelineOnLaunch = ref(localStorage.getItem(reopenLastPipelineOnLaunchStorageKey) !== 'false')

const inspectorWidthStorageKey = 'pipeline.editor.inspectorWidth'
const inspectorMinWidth = 280
const inspectorMaxWidth = 700
const inspectorWidth = ref(
  Math.min(
    inspectorMaxWidth,
    Math.max(inspectorMinWidth, parseInt(localStorage.getItem(inspectorWidthStorageKey) ?? '400', 10)),
  ),
)

function startInspectorResize(event: MouseEvent): void {
  event.preventDefault()
  const startX = event.clientX
  const startWidth = inspectorWidth.value

  function onMouseMove(e: MouseEvent): void {
    const delta = startX - e.clientX
    inspectorWidth.value = Math.min(inspectorMaxWidth, Math.max(inspectorMinWidth, startWidth + delta))
  }

  function onMouseUp(): void {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    localStorage.setItem(inspectorWidthStorageKey, String(inspectorWidth.value))
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}
const { t, locale } = useI18n()

const switchLanguageLabel = computed(() =>
  locale.value === 'fr'
    ? t('pipelineEditor.language.switchToEn')
    : t('pipelineEditor.language.switchToFr'),
)

const languageInitials = computed(() => locale.value === 'fr' ? 'FR' : 'EN')

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
    icon: 'pi pi-play',
    label: store.isRunning ? t('pipelineEditor.menu.running') : t('pipelineEditor.menu.runPipeline'),
    command: () => store.runCurrentPipeline(),
    disabled: store.isRunning,
    class: 'run-primary-action'
  },
  {
    icon: 'pi pi-save',
    label: t('pipelineEditor.menu.save'),
    command: () => saveCurrentPipeline(),
  },
  {
    icon: 'pi pi-folder',
    label: t('pipelineEditor.menu.file'),
    items: [
      {
        label: t('pipelineEditor.menu.newPipeline'),
        icon: 'pi pi-file',
        command: () => openCreateDialog(),
      },
      {
        label: t('pipelineEditor.menu.load'),
        icon: 'pi pi-folder-open',
        command: () => openLoadDialog(),
      },
      {
        separator: true
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
    ]
  },
  {
    icon: 'pi pi-cog',
    label: t('pipelineEditor.menu.settings'),
    command: () => showSettingsDialog.value = true
  },
  {
    icon: 'pi pi-question-circle',
    label: t('pipelineEditor.menu.help'),
    items: [
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
    ]
  }
])

const menubarKey = computed(() => `${locale.value}-${store.isRunning ? 'running' : 'idle'}`)
const lastRuns = computed<ExecutionRun[]>(() => store.runHistory.slice(0, 3))
const selectedRun = computed<ExecutionRun | null>(() =>
  store.runHistory.find((run) => run.id === selectedRunId.value) ?? null,
)
const canAddTabVariable = computed(() => newTabVariableName.value.trim().length > 0)
const selectedTabVariable = computed(() => {
  if (!selectedTabVariableId.value) {
    return null
  }
  return store.pipeline.variables.find((variable) => variable.id === selectedTabVariableId.value) ?? null
})

watch(newTabVariableName, () => {
  tabVariableError.value = null
})

function addVariable(name: string, value: string): void {
  store.addVariable(name, value)
}

function addVariableFromTab(): void {
  const trimmedName = newTabVariableName.value.trim()
  if (!trimmedName) {
    return
  }

  if (!isValidVariableName(trimmedName)) {
    tabVariableError.value = t('pipelineEditor.variables.nameInvalid')
    return
  }

  const duplicateExists = store.pipeline.variables.some(
    (variable) => variable.name.trim().toLowerCase() === trimmedName.toLowerCase(),
  )

  if (duplicateExists) {
    tabVariableError.value = t('pipelineEditor.variables.nameDuplicate')
    return
  }

  addVariable(trimmedName, newTabVariableValue.value)
  cancelAddTabVariable()
}

function countVariableLines(value: string): number {
  return value.split('\n').length
}

function selectTabVariable(variableId: string): void {
  selectedTabVariableId.value = variableId
  isAddingTabVariable.value = false
  tabVariableError.value = null
}

function startAddTabVariable(): void {
  selectedTabVariableId.value = null
  isAddingTabVariable.value = true
  newTabVariableName.value = ''
  newTabVariableValue.value = ''
  tabVariableError.value = null
}

function cancelAddTabVariable(): void {
  isAddingTabVariable.value = false
  newTabVariableName.value = ''
  newTabVariableValue.value = ''
  tabVariableError.value = null
}

function updateVariableName(variableId: string, value: string): void {
  store.updateVariable(variableId, { name: value })
}

function updateVariableValue(variableId: string, value: string): void {
  store.updateVariable(variableId, { value })
}

function removeVariable(variableId: string): void {
  store.removeVariable(variableId)
  if (selectedTabVariableId.value === variableId) {
    selectedTabVariableId.value = null
  }
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

function openCreateDialog(): void {
  createPipelineName.value = t('defaults.pipelineName')
  selectedCreateSource.value = 'empty'
  showCreateDialog.value = true
}

function selectCreateSource(source: 'empty' | string): void {
  selectedCreateSource.value = source
}

function confirmCreatePipeline(): void {
  const nextName = createPipelineName.value.trim()
  if (!nextName) {
    return
  }

  if (selectedCreateSource.value === 'empty') {
    store.resetPipeline()
  } else {
    const template = pipelineTemplates.find((item) => item.id === selectedCreateSource.value)
    if (!template) {
      return
    }
    store.loadFromTemplate(template.create())
  }

  store.renamePipeline(nextName)
  showCreateDialog.value = false
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

function loadTemplate(templateId: string): void {
  const tpl = pipelineTemplates.find((t) => t.id === templateId)
  if (!tpl) {
    return
  }
  store.loadFromTemplate(tpl.create())
  showLoadDialog.value = false
}

watch(autoOpenConsoleOnRunEnd, (enabled) => {
  localStorage.setItem(autoOpenConsoleOnRunEndStorageKey, String(enabled))
})

watch(autoSaveEnabled, (enabled) => {
  localStorage.setItem(autoSaveEnabledStorageKey, String(enabled))
  store.setAutoSaveEnabled(enabled)
})

watch(confirmDeleteNode, (enabled) => {
  localStorage.setItem(confirmDeleteNodeStorageKey, String(enabled))
})

watch(autoFitOnOpen, (enabled) => {
  localStorage.setItem(autoFitOnOpenStorageKey, String(enabled))
})

watch(reopenLastPipelineOnLaunch, (enabled) => {
  localStorage.setItem(reopenLastPipelineOnLaunchStorageKey, String(enabled))
})

function resetPreferences(): void {
  const keys = [
    autoOpenConsoleOnRunEndStorageKey,
    autoSaveEnabledStorageKey,
    confirmDeleteNodeStorageKey,
    autoFitOnOpenStorageKey,
    reopenLastPipelineOnLaunchStorageKey,
    inspectorWidthStorageKey,
  ]

  for (const key of keys) {
    localStorage.removeItem(key)
  }

  window.location.reload()
}

watch(
  () => store.isRunning,
  (isRunning, wasRunning) => {
    if (wasRunning && !isRunning && autoOpenConsoleOnRunEnd.value) {
      activeTab.value = 'console'
    }
  },
)

store.relocalizePipelineLabels()
store.setAutoSaveEnabled(autoSaveEnabled.value)
if (!reopenLastPipelineOnLaunch.value) {
  store.resetPipeline()
}
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
            :aria-label="t('pipelineEditor.pipelineNameDialog.open')"
            v-tooltip.right="t('pipelineEditor.pipelineNameDialog.open')"
            @click="openRenameDialog"
          />
          <span class="title-separator" aria-hidden="true" />
          <span
            class="autosave-tooltip-trigger"
            v-tooltip.right="autoSaveEnabled ? t('pipelineEditor.settings.autoSaveStatusEnabled') : t('pipelineEditor.settings.autoSaveStatusDisabled')"
          >
            <AutoSaveIcon :is-enabled="autoSaveEnabled" />
          </span>
          <span class="title-separator" aria-hidden="true" />
        </div>
      </template>
      <template #end>
        <Button
          :label="languageInitials"
          icon="pi pi-language"
          severity="secondary"
          text
          rounded
          :aria-label="switchLanguageLabel"
          v-tooltip.left="switchLanguageLabel"
          @click="toggleLanguage"
        />
      </template>
    </Menubar>

    <Dialog
      v-model:visible="showRenameDialog"
      :header="t('pipelineEditor.pipelineNameDialog.renameTitle')"
      :modal="true"
      style="width: min(520px, 92vw)"
    >
      <div class="rename-dialog-body">
        <label class="rename-label" for="pipeline-name-input">
          {{ t('pipelineEditor.pipelineNameDialog.nameLabel') }}
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
          :label="t('pipelineEditor.pipelineNameDialog.cancel')"
          text
          @click="showRenameDialog = false"
        />
        <Button
          :label="t('pipelineEditor.pipelineNameDialog.renameConfirm')"
          :disabled="draftPipelineName.trim().length === 0"
          @click="applyPipelineName"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showCreateDialog"
      :header="t('pipelineEditor.createDialog.title')"
      :modal="true"
      style="width: min(700px, 94vw)"
    >
      <section class="create-dialog">
        <p class="create-dialog-intro">{{ t('pipelineEditor.createDialog.intro') }}</p>

        <label class="rename-label" for="pipeline-create-name-input">
          {{ t('pipelineEditor.createDialog.nameLabel') }}
        </label>
        <InputText
          id="pipeline-create-name-input"
          :model-value="createPipelineName"
          autocomplete="off"
          @update:model-value="createPipelineName = String($event)"
          @keyup.enter="confirmCreatePipeline"
        />

        <button
          type="button"
          :class="['create-choice', 'create-choice--empty', { 'create-choice--selected': selectedCreateSource === 'empty' }]"
          @click="selectCreateSource('empty')"
        >
          <div class="create-choice-content">
            <strong>{{ t('pipelineEditor.createDialog.emptyTitle') }}</strong>
            <span>{{ t('pipelineEditor.createDialog.emptyDescription') }}</span>
          </div>
          <span class="create-choice-action">{{ t('pipelineEditor.createDialog.selectChoice') }}</span>
        </button>

        <ul class="create-template-list">
          <li v-for="template in pipelineTemplates" :key="template.id" class="create-template-item">
            <button
              type="button"
              :class="['create-choice', { 'create-choice--selected': selectedCreateSource === template.id }]"
              @click="selectCreateSource(template.id)"
            >
              <span class="create-template-icon" aria-hidden="true">{{ template.icon }}</span>
              <div class="create-choice-content">
                <strong>{{ t(template.nameKey) }}</strong>
                <span>{{ t(template.descriptionKey) }}</span>
              </div>
              <span class="create-choice-action">{{ t('pipelineEditor.createDialog.selectChoice') }}</span>
            </button>
          </li>
        </ul>
      </section>
      <template #footer>
        <Button
          :label="t('pipelineEditor.createDialog.cancel')"
          text
          @click="showCreateDialog = false"
        />
        <Button
          :label="t('pipelineEditor.createDialog.createConfirm')"
          :disabled="createPipelineName.trim().length === 0"
          @click="confirmCreatePipeline"
        />
      </template>
    </Dialog>

    <PipelineSettingsDialog
      v-model:visible="showSettingsDialog"
      v-model:auto-open-console-on-run-end="autoOpenConsoleOnRunEnd"
      v-model:auto-save-enabled="autoSaveEnabled"
      v-model:confirm-delete-node="confirmDeleteNode"
      v-model:auto-fit-on-open="autoFitOnOpen"
      v-model:reopen-last-pipeline-on-launch="reopenLastPipelineOnLaunch"
      @reset-preferences="resetPreferences"
    />

    <PipelineHelpDialog
      v-model:visible="showHelpDialog"
    />

    <PipelineLoadDialog
      v-model:visible="showLoadDialog"
      v-model:selected-saved-pipeline-id="selectedSavedPipelineId"
      :saved-pipelines="store.savedPipelines"
      @load-selected="loadSelectedPipeline"
      @load-template="loadTemplate"
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
        <Tab value="variables">{{ t('pipelineEditor.tabs.variables') }}</Tab>
        <Tab value="console">{{ t('pipelineEditor.tabs.console') }}</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="flow">
          <section
            class="workspace-grid"
            :class="{ 'workspace-grid--inspector-open': !!store.selectedNode }"
            :style="store.selectedNode ? { '--inspector-width': inspectorWidth + 'px' } : {}"
          >
            <NodePalette />
            <PipelineCanvas
              :auto-fit-on-open="autoFitOnOpen"
            />
            <div class="inspector-wrapper" :style="store.selectedNode ? { width: inspectorWidth + 'px' } : {}">
              <div class="inspector-resize-handle" @mousedown="startInspectorResize" />
              <InspectorPanel />
            </div>
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
        <TabPanel value="variables">
          <section class="variables-tab">
            <div class="variables-tab-header">
              <h3>{{ t('pipelineEditor.variables.title') }}</h3>
              <p>{{ t('pipelineEditor.variables.description') }}</p>
            </div>

            <div class="tab-variables-container">
              <aside class="tab-variables-sidebar">
                <div class="tab-sidebar-header">
                  <h4 class="tab-sidebar-title">{{ t('pipelineEditor.variables.title') }}</h4>
                  <Button
                    icon="pi pi-plus"
                    severity="success"
                    rounded
                    text
                    :aria-label="t('pipelineEditor.variables.add')"
                    @click="startAddTabVariable"
                  />
                </div>

                <div class="tab-variables-list">

                  <div v-if="store.pipeline.variables.length === 0" class="tab-list-empty">
                    {{ t('pipelineEditor.variables.empty') }}
                  </div>

                  <button
                    v-for="variable in store.pipeline.variables"
                    :key="variable.id"
                    type="button"
                    class="tab-list-item"
                    :class="{ 'tab-list-item--active': selectedTabVariableId === variable.id }"
                    @click="selectTabVariable(variable.id)"
                  >
                    <span class="tab-item-icon"><i class="pi pi-circle-fill" /></span>
                    <span class="tab-item-content">
                      <span class="tab-item-name">{{ variable.name }}</span>
                      <span class="tab-item-meta">{{ countVariableLines(variable.value) }} {{ t('pipelineEditor.variables.lines') }}</span>
                    </span>
                  </button>
                </div>
              </aside>

              <section class="tab-variables-editor">
                <Message v-if="tabVariableError" severity="error" :closable="true" @close="tabVariableError = null">
                  {{ tabVariableError }}
                </Message>

                <div v-if="isAddingTabVariable" class="tab-editor-content">
                  <h4 class="tab-editor-title">{{ t('pipelineEditor.variables.newVariable') }}</h4>

                  <div class="tab-form-group">
                    <label class="tab-form-label">{{ t('pipelineEditor.variables.namePlaceholder') }}</label>
                    <InputText
                      :model-value="newTabVariableName"
                      :placeholder="t('pipelineEditor.variables.namePlaceholder')"
                      @update:model-value="newTabVariableName = String($event)"
                    />
                  </div>

                  <div class="tab-form-group">
                    <label class="tab-form-label">{{ t('pipelineEditor.variables.valuePlaceholder') }}</label>
                    <Textarea
                      :model-value="newTabVariableValue"
                      auto-resize
                      rows="8"
                      :placeholder="t('pipelineEditor.variables.valuePlaceholder')"
                      @update:model-value="newTabVariableValue = String($event)"
                    />
                    <small class="tab-line-count">{{ countVariableLines(newTabVariableValue) }} {{ t('pipelineEditor.variables.lines') }}</small>
                  </div>

                  <div class="tab-form-actions">
                    <Button
                      :label="t('pipelineEditor.variables.add')"
                      icon="pi pi-check"
                      severity="success"
                      :disabled="!canAddTabVariable"
                      @click="addVariableFromTab"
                    />
                    <Button
                      :label="t('common.cancel')"
                      icon="pi pi-times"
                      severity="secondary"
                      @click="cancelAddTabVariable"
                    />
                  </div>
                </div>

                <div v-else-if="selectedTabVariable" class="tab-editor-content">
                  <h4 class="tab-editor-title">{{ selectedTabVariable.name }}</h4>

                  <div class="tab-form-group">
                    <label class="tab-form-label">{{ t('pipelineEditor.variables.namePlaceholder') }}</label>
                    <InputText
                      :model-value="selectedTabVariable.name"
                      @update:model-value="updateVariableName(selectedTabVariable.id, String($event))"
                    />
                  </div>

                  <div class="tab-form-group">
                    <label class="tab-form-label">{{ t('pipelineEditor.variables.valuePlaceholder') }}</label>
                    <Textarea
                      :model-value="selectedTabVariable.value"
                      auto-resize
                      rows="8"
                      :placeholder="t('pipelineEditor.variables.valuePlaceholder')"
                      @update:model-value="updateVariableValue(selectedTabVariable.id, String($event))"
                    />
                    <small class="tab-line-count">{{ countVariableLines(selectedTabVariable.value) }} {{ t('pipelineEditor.variables.lines') }}</small>
                  </div>

                  <div class="tab-form-actions">
                    <Button
                      icon="pi pi-trash"
                      severity="danger"
                      :label="t('pipelineEditor.variables.remove')"
                      @click="removeVariable(selectedTabVariable.id)"
                    />
                  </div>
                </div>

                <div v-else class="tab-editor-empty">
                  <i class="pi pi-inbox" />
                  <p>{{ t('pipelineEditor.variables.selectOrCreate') }}</p>
                </div>
              </section>
            </div>
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
  gap: 0.35rem;
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

.autosave-tooltip-trigger {
  display: inline-flex;
  align-items: center;
}

.toolbar-menubar :deep(.run-primary-action .p-menubar-item-link) {
  background: transparent !important;
  color: var(--p-button-text-success-color) !important;
  border: 1px solid var(--p-button-text-success-color) !important;
  border-radius: 32px;
  padding: 0.625rem 1rem !important;
  font-weight: 400;
}

.toolbar-menubar :deep(.run-primary-action .p-menubar-item-link:hover) {
  background: var(--p-button-outlined-success-active-background) !important;
}

.toolbar-menubar :deep(.run-primary-action .p-menubar-item-label) {
  color: var(--p-button-text-success-color) !important;
}

.toolbar-menubar :deep(.run-primary-action .p-menubar-item-icon) {
  color: var(--p-button-text-success-color) !important;
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

.create-dialog {
  display: grid;
  gap: 0.7rem;
}

.create-dialog-intro {
  margin: 0;
  color: var(--text-soft);
  font-size: 0.9rem;
}

.create-template-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.45rem;
  max-height: 44vh;
  overflow: auto;
}

.create-template-item {
  margin: 0;
}

.create-choice {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: transparent;
  color: inherit;
  padding: 0.7rem 0.85rem;
  cursor: pointer;
  text-align: left;
}

.create-choice:hover {
  border-color: var(--primary-color, #0ea5e9);
}

.create-choice--selected {
  border-color: var(--primary-color, #0ea5e9);
  box-shadow: 0 0 0 1px var(--primary-color, #0ea5e9) inset;
}

.create-choice--empty {
  background: color-mix(in srgb, var(--surface-card) 86%, var(--primary-color, #0ea5e9) 14%);
}

.create-choice-content {
  flex: 1;
  display: grid;
  gap: 0.2rem;
}

.create-choice-content span {
  font-size: 0.82rem;
  color: var(--text-soft);
}

.create-template-icon {
  font-size: 1.45rem;
  line-height: 1;
  flex-shrink: 0;
}

.create-choice-action {
  font-size: 0.8rem;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.workspace-tabs {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.variables-tab {
  min-height: 56vh;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.variables-tab-header h3 {
  margin: 0;
  font-size: 0.95rem;
}

.variables-tab-header p {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: var(--text-soft);
}

.tab-variables-container {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.5rem;
  min-height: 0;
  flex: 1;
}

.tab-variables-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-right: 1px solid var(--surface-border);
  padding-right: 1rem;
  min-height: 0;
}

.tab-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.tab-sidebar-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
}

.tab-variables-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  padding-right: 0.5rem;
  min-height: 0;
}

.tab-list-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  background: transparent;
  text-align: left;
}

.tab-list-item:hover {
  background: var(--surface-100);
}

.tab-list-item--active {
  background: var(--primary-50);
  border-color: var(--primary-200);
}

.tab-list-item--new {
  background: color-mix(in srgb, var(--primary-color) 8%, transparent);
  border: 1px dashed var(--primary-200);
}

.tab-item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.2rem;
  color: var(--text-soft);
}

.tab-item-content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.tab-item-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-item-meta {
  font-size: 0.75rem;
  color: var(--text-soft);
}

.tab-list-empty {
  padding: 1rem 0.5rem;
  text-align: center;
  color: var(--text-soft);
  font-size: 0.85rem;
}

.tab-variables-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  background: var(--surface-50);
  min-height: 0;
  overflow-y: auto;
}

.tab-editor-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tab-editor-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  border-bottom: 2px solid var(--primary-200);
  padding-bottom: 0.75rem;
}

.tab-editor-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--text-soft);
  min-height: 200px;
}

.tab-editor-empty i {
  font-size: 2.5rem;
  opacity: 0.5;
}

.tab-form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.tab-form-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
}

.tab-line-count {
  font-size: 0.75rem;
  color: var(--text-soft);
}

.tab-form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.workspace-grid {
  min-height: 56vh;
  display: grid;
  gap: 0.9rem;
  grid-template-columns: 220px 1fr 0px;
  transition: grid-template-columns 0.25s ease;
}

.workspace-grid--inspector-open {
  grid-template-columns: 220px 1fr var(--inspector-width, 400px);
}

.inspector-wrapper {
  overflow: hidden;
  min-width: 0;
  position: relative;
}

.inspector-resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  cursor: col-resize;
  z-index: 1;
  border-radius: 4px 0 0 4px;
  transition: background 0.15s ease;
}

.inspector-resize-handle:hover,
.inspector-resize-handle:active {
  background: var(--primary-color, #6366f1);
  opacity: 0.5;
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
  .workspace-grid,
  .workspace-grid--inspector-open {
    grid-template-columns: 1fr;
    grid-template-rows: auto 58vh auto;
    transition: none;
  }

  .inspector-wrapper {
    overflow: visible;
    width: auto !important;
  }

  .inspector-resize-handle {
    display: none;
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

  .tab-variables-container {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .tab-variables-sidebar {
    border-right: none;
    border-bottom: 1px solid var(--surface-border);
    padding-right: 0;
    padding-bottom: 1rem;
  }

  .tab-variables-list {
    max-height: 180px;
  }
}
</style>
