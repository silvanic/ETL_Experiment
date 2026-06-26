import { createRouter, createWebHashHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
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
    {
      path: '/help',
      name: 'help',
      component: () => import('@/modules/pipeline/components/PipelineHelpPage.vue'),
      children: [
        {
          path: '',
          name: 'help-overview',
          component: () => import('@/modules/pipeline/components/help/HelpOverviewPage.vue'),
        },
        {
          path: 'nodes/:nodeKey',
          name: 'help-node',
          component: () => import('@/modules/pipeline/components/help/HelpNodePage.vue'),
        },
        {
          path: 'examples/:exampleId',
          name: 'help-example',
          component: () => import('@/modules/pipeline/components/help/HelpExamplePage.vue'),
        },
        {
          path: 'condition-array',
          name: 'help-condition-array',
          component: () => import('@/modules/pipeline/components/help/HelpConditionArrayPage.vue'),
        },
        {
          path: 'multiselection',
          name: 'help-multiselection',
          component: () => import('@/modules/pipeline/components/help/HelpMultiSelectionPage.vue'),
        },
        {
          path: 'concepts',
          name: 'help-concepts',
          component: () => import('@/modules/pipeline/components/help/HelpConceptsPage.vue'),
        },
      ],
    },
  ],
})
