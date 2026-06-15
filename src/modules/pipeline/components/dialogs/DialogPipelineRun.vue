<script setup lang="ts">
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import RunConsole from '@/modules/pipeline/components/RunConsole.vue'
import { useI18n } from 'vue-i18n'
import type { ExecutionLog } from '@/modules/pipeline/domain/types'

interface Props {
  visible: boolean
  logs: ExecutionLog[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const { t } = useI18n()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="t('pipelineEditor.history.dialogTitle')"
    :modal="true"
    style="width: 96vw"
  >
    <section class="run-history-dialog-body">
      <RunConsole :logs="props.logs" />
    </section>
  </Dialog>
</template>

<style scoped>
.run-history-dialog-body {
  min-height: 60vh;
}
</style>
