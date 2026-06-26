<script setup lang="ts">
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { RouterView } from 'vue-router'
</script>

<template>
  <Toast position="top-center" />
  <ConfirmDialog />
  <RouterView />
</template>

<style>
.p-dialog-footer{
  justify-content: flex-start;
  flex-direction: row-reverse;
}
</style>