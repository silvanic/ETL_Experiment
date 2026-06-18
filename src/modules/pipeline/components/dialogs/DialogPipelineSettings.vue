<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'
import { useI18n } from 'vue-i18n'
import type { PipelineVariable } from '@/modules/pipeline/domain/types'
import { isValidVariableName } from '@/modules/pipeline/domain/variables'

interface Props {
  visible: boolean
  autoOpenConsoleOnRunEnd: boolean
  variables: PipelineVariable[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:autoOpenConsoleOnRunEnd': [value: boolean]
  'add-variable': [name: string, value: string]
  'update-variable-name': [variableId: string, value: string]
  'update-variable-value': [variableId: string, value: string]
  'remove-variable': [variableId: string]
}>()

const { t } = useI18n()
const newVariableName = ref('')
const newVariableValue = ref('')
const addVariableError = ref<string | null>(null)
const selectedVariableId = ref<string | null>(null)
const isAddingNew = ref(false)

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const autoOpenConsole = computed({
  get: () => props.autoOpenConsoleOnRunEnd,
  set: (value: boolean) => emit('update:autoOpenConsoleOnRunEnd', value),
})

const canAddVariable = computed(() => newVariableName.value.trim().length > 0)

const isVariableNameValid = computed(() => {
  const trimmed = newVariableName.value.trim()
  return trimmed.length === 0 || isValidVariableName(trimmed)
})

const selectedVariable = computed(() => {
  if (!selectedVariableId.value) {
    return null
  }
  return props.variables.find((variable) => variable.id === selectedVariableId.value) ?? null
})

watch(newVariableName, () => {
  addVariableError.value = null
})

function countLines(value: string): number {
  return value.split('\n').length
}

function selectVariable(variableId: string): void {
  selectedVariableId.value = variableId
  isAddingNew.value = false
}

function startAddNew(): void {
  selectedVariableId.value = null
  isAddingNew.value = true
  newVariableName.value = ''
  newVariableValue.value = ''
  addVariableError.value = null
}

function cancelAddNew(): void {
  isAddingNew.value = false
  newVariableName.value = ''
  newVariableValue.value = ''
  addVariableError.value = null
}

function addVariable(): void {
  if (!canAddVariable.value) {
    return
  }

  addVariableError.value = null

  const trimmedName = newVariableName.value.trim()
  if (!isVariableNameValid.value) {
    addVariableError.value = t('pipelineEditor.variables.nameInvalid')
    return
  }

  const duplicateExists = props.variables.some(
    (variable) => variable.name.trim().toLowerCase() === trimmedName.toLowerCase(),
  )

  if (duplicateExists) {
    addVariableError.value = t('pipelineEditor.variables.nameDuplicate')
    return
  }

  emit('add-variable', trimmedName, newVariableValue.value)
  cancelAddNew()
}

function updateVariableName(variableId: string, value: unknown): void {
  emit('update-variable-name', variableId, String(value))
}

function updateVariableValue(variableId: string, value: unknown): void {
  emit('update-variable-value', variableId, String(value))
}

function removeVariable(variableId: string): void {
  emit('remove-variable', variableId)

  if (selectedVariableId.value === variableId) {
    selectedVariableId.value = null
  }
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="t('pipelineEditor.menu.settings')"
    :modal="true"
    style="width: min(1200px, 95vw); max-height: 85vh"
  >
    <section class="settings-container">
      <div class="settings-header">
        <label class="settings-option">
          <input v-model="autoOpenConsole" type="checkbox" />
          <span>{{ t('pipelineEditor.settings.autoOpenConsoleOnRunEnd') }}</span>
        </label>
        <p class="settings-description">{{ t('pipelineEditor.variables.description') }}</p>
      </div>

      <div class="variables-container">
        <aside class="variables-sidebar">
          <div class="sidebar-header">
            <h3 class="sidebar-title">{{ t('pipelineEditor.variables.title') || 'Variables' }}</h3>
            <Button
              icon="pi pi-plus"
              severity="success"
              rounded
              text
              :aria-label="t('pipelineEditor.variables.add')"
              @click="startAddNew"
            />
          </div>

          <div class="variables-list">
            <button
              type="button"
              class="list-item list-item--new"
              :class="{ 'list-item--active': isAddingNew }"
              @click="startAddNew"
            >
              <span class="item-icon"><i class="pi pi-plus-circle" /></span>
              <span class="item-content">
                <span class="item-name">{{ t('pipelineEditor.variables.newVariable') }}</span>
              </span>
            </button>

            <div v-if="props.variables.length === 0" class="list-empty">
              {{ t('pipelineEditor.variables.empty') }}
            </div>

            <button
              v-for="variable in props.variables"
              :key="variable.id"
              type="button"
              class="list-item"
              :class="{ 'list-item--active': selectedVariableId === variable.id }"
              @click="selectVariable(variable.id)"
            >
              <span class="item-icon"><i class="pi pi-circle-fill" /></span>
              <span class="item-content">
                <span class="item-name">{{ variable.name }}</span>
                <span class="item-meta">{{ countLines(variable.value) }} {{ t('pipelineEditor.variables.lines') }}</span>
              </span>
            </button>
          </div>
        </aside>

        <section class="variables-editor">
          <Message
            v-if="addVariableError"
            severity="error"
            :closable="true"
            @close="addVariableError = null"
          >
            {{ addVariableError }}
          </Message>

          <div v-if="isAddingNew" class="editor-content">
            <h3 class="editor-title">{{ t('pipelineEditor.variables.newVariable') }}</h3>

            <div class="form-group">
              <label class="form-label">{{ t('pipelineEditor.variables.namePlaceholder') }}</label>
              <InputText
                :model-value="newVariableName"
                :placeholder="t('pipelineEditor.variables.namePlaceholder')"
                @update:model-value="newVariableName = String($event)"
              />
            </div>

            <div class="form-group">
              <label class="form-label">{{ t('pipelineEditor.variables.valuePlaceholder') }}</label>
              <Textarea
                :model-value="newVariableValue"
                auto-resize
                rows="8"
                :placeholder="t('pipelineEditor.variables.valuePlaceholder')"
                @update:model-value="newVariableValue = String($event)"
              />
              <small class="line-count">{{ countLines(newVariableValue) }} {{ t('pipelineEditor.variables.lines') }}</small>
            </div>

            <div class="form-actions">
              <Button
                :label="t('pipelineEditor.variables.add')"
                icon="pi pi-check"
                severity="success"
                :disabled="!canAddVariable"
                @click="addVariable"
              />
              <Button
                :label="t('common.cancel')"
                icon="pi pi-times"
                severity="secondary"
                @click="cancelAddNew"
              />
            </div>
          </div>

          <div v-else-if="selectedVariable" class="editor-content">
            <h3 class="editor-title">{{ selectedVariable.name }}</h3>

            <div class="form-group">
              <label class="form-label">{{ t('pipelineEditor.variables.namePlaceholder') }}</label>
              <InputText
                :model-value="selectedVariable.name"
                @update:model-value="updateVariableName(selectedVariable.id, $event)"
              />
            </div>

            <div class="form-group">
              <label class="form-label">{{ t('pipelineEditor.variables.valuePlaceholder') }}</label>
              <Textarea
                :model-value="selectedVariable.value"
                auto-resize
                rows="8"
                :placeholder="t('pipelineEditor.variables.valuePlaceholder')"
                @update:model-value="updateVariableValue(selectedVariable.id, $event)"
              />
              <small class="line-count">{{ countLines(selectedVariable.value) }} {{ t('pipelineEditor.variables.lines') }}</small>
            </div>

            <div class="form-actions">
              <Button
                icon="pi pi-trash"
                severity="danger"
                :label="t('pipelineEditor.variables.remove')"
                @click="removeVariable(selectedVariable.id)"
              />
            </div>
          </div>

          <div v-else class="editor-empty">
            <i class="pi pi-inbox" />
            <p>{{ t('pipelineEditor.variables.selectOrCreate') }}</p>
          </div>
        </section>
      </div>
    </section>
  </Dialog>
</template>

<style scoped>
.settings-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
}

.settings-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-bottom: 1px solid var(--surface-border);
  padding-bottom: 1rem;
}

.settings-option {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.88rem;
}

.settings-description {
  margin: 0;
  color: var(--text-soft);
  font-size: 0.85rem;
}

.variables-container {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.5rem;
  min-height: 0;
}

.variables-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-right: 1px solid var(--surface-border);
  padding-right: 1rem;
  min-height: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.sidebar-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
}

.variables-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  padding-right: 0.5rem;
  min-height: 0;
}

.list-item {
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

.list-item:hover {
  background: var(--surface-100);
}

.list-item--active {
  background: var(--primary-50);
  border-color: var(--primary-200);
}

.list-item--new {
  background: color-mix(in srgb, var(--primary-color) 8%, transparent);
  border: 1px dashed var(--primary-200);
}

.item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.2rem;
  color: var(--text-soft);
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.item-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  font-size: 0.75rem;
  color: var(--text-soft);
}

.list-empty {
  padding: 1rem 0.5rem;
  text-align: center;
  color: var(--text-soft);
  font-size: 0.85rem;
}

.variables-editor {
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

.editor-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.editor-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  border-bottom: 2px solid var(--primary-200);
  padding-bottom: 0.75rem;
}

.editor-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--text-soft);
  min-height: 200px;
}

.editor-empty i {
  font-size: 2.5rem;
  opacity: 0.5;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
}

.line-count {
  font-size: 0.75rem;
  color: var(--text-soft);
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

:deep(.p-textarea) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.85rem;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .variables-container {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .variables-sidebar {
    border-right: none;
    border-bottom: 1px solid var(--surface-border);
    padding-right: 0;
    padding-bottom: 1rem;
  }

  .variables-list {
    max-height: 180px;
  }
}
</style>
