<script setup lang="ts">
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import { useI18n } from 'vue-i18n'

interface Props {
  visible: boolean
  autoOpenConsoleOnRunEnd: boolean
  autoSaveEnabled: boolean
  confirmDeleteNode: boolean
  autoFitOnOpen: boolean
  reopenLastPipelineOnLaunch: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:autoOpenConsoleOnRunEnd': [value: boolean]
  'update:autoSaveEnabled': [value: boolean]
  'update:confirmDeleteNode': [value: boolean]
  'update:autoFitOnOpen': [value: boolean]
  'update:reopenLastPipelineOnLaunch': [value: boolean]
  'reset-preferences': []
}>()

const { t } = useI18n()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const autoOpenConsole = computed({
  get: () => props.autoOpenConsoleOnRunEnd,
  set: (value: boolean) => emit('update:autoOpenConsoleOnRunEnd', value),
})

const autoSave = computed({
  get: () => props.autoSaveEnabled,
  set: (value: boolean) => emit('update:autoSaveEnabled', value),
})

const confirmDeleteNode = computed({
  get: () => props.confirmDeleteNode,
  set: (value: boolean) => emit('update:confirmDeleteNode', value),
})

const autoFitOnOpen = computed({
  get: () => props.autoFitOnOpen,
  set: (value: boolean) => emit('update:autoFitOnOpen', value),
})

const reopenLastPipelineOnLaunch = computed({
  get: () => props.reopenLastPipelineOnLaunch,
  set: (value: boolean) => emit('update:reopenLastPipelineOnLaunch', value),
})

function resetPreferences(): void {
  emit('reset-preferences')
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="t('pipelineEditor.menu.settings')"
    :modal="true"
    style="width: min(640px, 95vw)"
  >
    <section class="settings-container">
      <label class="settings-option">
        <input v-model="autoOpenConsole" type="checkbox" />
        <span>{{ t('pipelineEditor.settings.autoOpenConsoleOnRunEnd') }}</span>
      </label>
      <label class="settings-option">
        <input v-model="autoSave" type="checkbox" />
        <span>{{ t('pipelineEditor.settings.autoSaveEnabled') }}</span>
      </label>
      <label class="settings-option">
        <input v-model="confirmDeleteNode" type="checkbox" />
        <span>{{ t('pipelineEditor.settings.confirmDeleteNode') }}</span>
      </label>
      <label class="settings-option">
        <input v-model="autoFitOnOpen" type="checkbox" />
        <span>{{ t('pipelineEditor.settings.autoFitOnOpen') }}</span>
      </label>
      <label class="settings-option">
        <input v-model="reopenLastPipelineOnLaunch" type="checkbox" />
        <span>{{ t('pipelineEditor.settings.reopenLastPipelineOnLaunch') }}</span>
      </label>
      <p class="settings-description">{{ t('pipelineEditor.settings.variablesMoved') }}</p>
      <button type="button" class="reset-preferences-button" @click="resetPreferences">
        {{ t('pipelineEditor.settings.resetPreferences') }}
      </button>
    </section>
  </Dialog>
</template>

<style scoped>
.settings-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.settings-option {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.9rem;
}

.settings-description {
  margin: 0;
  color: var(--text-soft);
  font-size: 0.85rem;
}

.reset-preferences-button {
  width: fit-content;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  color: var(--text-soft);
  padding: 0.45rem 0.7rem;
  cursor: pointer;
}

.reset-preferences-button:hover {
  border-color: var(--primary-color, #0ea5e9);
  color: var(--text);
}
</style>
