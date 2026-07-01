<script setup lang="ts">
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import CodeEditorField from '@/components/CodeEditorField.vue'

const props = withDefaults(defineProps<{
  visible: boolean
  title: string
  content: string
  subtitle?: string
  warning?: string
  language?: string
  height?: number
  width?: string
}>(), {
  subtitle: '',
  warning: '',
  language: 'json',
  height: 360,
  width: 'min(90vw, 900px)',
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const visibleModel = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})
</script>

<template>
  <Dialog
    v-model:visible="visibleModel"
    modal
    :header="title"
    :style="{ width }"
  >
    <p v-if="subtitle" class="hint hint--info preview-note">
      {{ subtitle }}
    </p>
    <p v-if="warning" class="hint preview-warning">
      {{ warning }}
    </p>
    <CodeEditorField
      :model-value="content"
      :language="language"
      :height="height"
      :read-only="true"
      :suggestions="[]"
      :snippets="[]"
    />
  </Dialog>
</template>

<style scoped>
.hint {
  margin: 0;
  font-style: italic;
}

.hint--info {
  font-style: normal;
}

.preview-note {
  margin-bottom: 0.4rem;
}

.preview-warning {
  margin-bottom: 0.6rem;
}
</style>
