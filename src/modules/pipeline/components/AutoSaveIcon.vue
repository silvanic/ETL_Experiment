<template>
  <svg
    :class="['autosave-icon-svg', isEnabled ? 'autosave-icon-svg--on' : 'autosave-icon-svg--off']"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    fill="currentColor"
  >
    <!-- Document principal -->
    <path
      d="M 7 2 H 14.5 L 19 6.5 V 19.5 C 19 20.3 18.3 21 17.5 21 H 7 C 6.2 21 5.5 20.3 5.5 19.5 V 3.5 C 5.5 2.7 6.2 2 7 2 Z"
      fill="currentColor"
      opacity="0.2"
    />
    <path
      d="M 7 2 H 14.5 L 19 6.5 V 19.5 C 19 20.3 18.3 21 17.5 21 H 7 C 6.2 21 5.5 20.3 5.5 19.5 V 3.5 C 5.5 2.7 6.2 2 7 2 Z"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M 14.5 2 V 5.3 C 14.5 6 15 6.5 15.7 6.5 H 19"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Badge sync en bas à gauche -->
    <circle cx="7" cy="17" r="5" fill="currentColor" />
    <circle cx="7" cy="17" r="5" fill="none" stroke="currentColor" stroke-width="1.2" />

    <!-- Flèche haute -->
    <path
      d="M 4.7 16.2 A 2.8 2.8 0 0 1 8.8 14.8"
      fill="none"
      stroke="white"
      stroke-width="1.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path d="M 8.8 14.8 L 8.0 14.8 L 8.5 15.5" fill="none" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Flèche basse -->
    <path
      d="M 9.3 17.8 A 2.8 2.8 0 0 1 5.2 19.2"
      fill="none"
      stroke="white"
      stroke-width="1.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path d="M 5.2 19.2 L 6.0 19.2 L 5.5 18.5" fill="none" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  isEnabled?: boolean
}

withDefaults(defineProps<Props>(), {
  isEnabled: true,
})
</script>

<style scoped>
.autosave-icon-svg {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.9rem;
  cursor: default;
  transition: color 0.2s ease;
  flex-shrink: 0;
}

.autosave-icon-svg--on {
  color: var(--p-green-500);
}

.autosave-icon-svg--on:hover {
  color: var(--p-green-600);
}

.autosave-icon-svg--off {
  color: var(--p-surface-400);
}

.autosave-icon-svg--off:hover {
  color: var(--p-surface-500);
}
</style>

