<template>
  <svg
    :viewBox="`0 0 24 24`"
    :width="size"
    :height="size"
    class="mdi-icon"
    :style="{ color, ...customStyle }"
    v-bind="$attrs"
  >
    <path :d="iconPath" fill="currentColor" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  path: string
  size?: number | string
  color?: string
  customStyle?: Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  color: 'currentColor',
  customStyle: () => ({}),
})

const iconPath = computed(() => props.path)
</script>

<style scoped>
.mdi-icon {
  display: inline-block;
  vertical-align: middle;
}
</style>
