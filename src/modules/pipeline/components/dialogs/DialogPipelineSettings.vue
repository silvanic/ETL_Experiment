<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
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

watch(newVariableName, () => {
  addVariableError.value = null
})

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
  newVariableName.value = ''
  newVariableValue.value = ''
}

function updateVariableName(variableId: string, value: unknown): void {
  emit('update-variable-name', variableId, String(value))
}

function updateVariableValue(variableId: string, value: unknown): void {
  emit('update-variable-value', variableId, String(value))
}

function removeVariable(variableId: string): void {
  emit('remove-variable', variableId)
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="t('pipelineEditor.menu.settings')"
    :modal="true"
    style="width: min(900px, 92vw)"
  >
    <section class="variables-settings">
      <label class="settings-option">
        <input v-model="autoOpenConsole" type="checkbox" />
        <span>{{ t('pipelineEditor.settings.autoOpenConsoleOnRunEnd') }}</span>
      </label>

      <p class="variables-description">{{ t('pipelineEditor.variables.description') }}</p>

      <Message
        v-if="addVariableError"
        severity="error"
        :closable="true"
        @close="addVariableError = null"
      >
        {{ addVariableError }}
      </Message>

      <div class="variable-row variable-row--new">
        <InputText
          :model-value="newVariableName"
          :placeholder="t('pipelineEditor.variables.namePlaceholder')"
          @update:model-value="newVariableName = String($event)"
        />
        <InputText
          :model-value="newVariableValue"
          :placeholder="t('pipelineEditor.variables.valuePlaceholder')"
          @update:model-value="newVariableValue = String($event)"
        />
        <Button
          icon="pi pi-plus"
          :label="t('pipelineEditor.variables.add')"
          :disabled="!canAddVariable"
          @click="addVariable"
        />
      </div>

      <div v-if="variables.length === 0" class="variables-empty">
        {{ t('pipelineEditor.variables.empty') }}
      </div>

      <div v-else class="variables-list">
        <div
          v-for="variable in variables"
          :key="variable.id"
          class="variable-row"
        >
          <InputText
            :model-value="variable.name"
            :placeholder="t('pipelineEditor.variables.namePlaceholder')"
            @update:model-value="updateVariableName(variable.id, $event)"
          />
          <InputText
            :model-value="variable.value"
            :placeholder="t('pipelineEditor.variables.valuePlaceholder')"
            @update:model-value="updateVariableValue(variable.id, $event)"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            :aria-label="t('pipelineEditor.variables.remove')"
            @click="removeVariable(variable.id)"
          />
        </div>
      </div>
    </section>
  </Dialog>
</template>

<style scoped>
.variables-settings {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.settings-option {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.88rem;
}

.variables-description {
  margin: 0;
  color: var(--text-soft);
}

.variables-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  max-height: 46vh;
  overflow: auto;
  padding-right: 0.15rem;
}

.variable-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.55rem;
  align-items: center;
}

.variable-row--new {
  margin-bottom: 0.35rem;
}

.variables-empty {
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 0.7rem;
  color: var(--text-soft);
}

@media (max-width: 1100px) {
  .variable-row {
    grid-template-columns: 1fr;
  }
}
</style>
