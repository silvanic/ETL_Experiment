<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@vue-flow/core'
import { usePipelineEditorStore } from '@/modules/pipeline/stores/pipelineEditorStore'
import { t } from '@/i18n'

const props = defineProps<EdgeProps>()

const store = usePipelineEditorStore()
const isHovered = ref(false)

const path = computed(() =>
  getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  }),
)

function deleteEdge(): void {
  store.onEdgesChange([{
    type: 'remove',
    id: props.id,
    source: props.source,
    target: props.target,
    sourceHandle: props.sourceHandleId ?? null,
    targetHandle: props.targetHandleId ?? null,
  }])
}
</script>

<template>
  <BaseEdge
    :path="path[0]"
    :marker-end="markerEnd"
    :style="style"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  />
  <EdgeLabelRenderer>
    <div
      v-if="isHovered || selected"
      class="nodrag nopan edge-delete-wrapper"
      :style="{ transform: `translate(-50%, -50%) translate(${path[1]}px, ${path[2]}px)` }"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <button
        class="edge-delete-btn"
        :title="t('common.delete')"
        @click.stop="deleteEdge"
      >
        ×
      </button>
    </div>
  </EdgeLabelRenderer>
</template>

<style scoped>
.edge-delete-wrapper {
  position: absolute;
  pointer-events: all;
}

.edge-delete-btn {
  width: 22px;
  height: 22px;
  background: #e53e3e;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, transform 0.1s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}

.edge-delete-btn:hover {
  background: #c53030;
  transform: scale(1.15);
}
</style>
