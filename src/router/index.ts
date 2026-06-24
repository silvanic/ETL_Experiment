import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/modules/pipeline/components/PipelineHomePage.vue'),
    },
    {
      path: '/editor',
      name: 'editor',
      component: () => import('@/modules/pipeline/components/PipelineEditorPage.vue'),
    },
  ],
})
