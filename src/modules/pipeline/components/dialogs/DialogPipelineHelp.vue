<script setup lang="ts">
import { computed, ref } from 'vue'
import Dialog from 'primevue/dialog'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import { useI18n } from 'vue-i18n'

interface Props {
  visible: boolean
}

interface HelpFieldDef {
  labelKey: string
  descKey: string
}

interface HelpField {
  label: string
  value: string
}

interface HelpBranch {
  label: string
  fields: HelpField[]
}

interface HelpStep {
  type: 'start' | 'api' | 'condition' | 'transform' | 'output'
  title: string
  noConfig?: boolean
  fields?: HelpField[]
  branches?: { true: HelpBranch; false: HelpBranch }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const { t } = useI18n()

const helpNodeKeys = ['start', 'api', 'setVariable', 'condition', 'filter', 'transform', 'output'] as const

const helpNodeFieldDefs: Record<typeof helpNodeKeys[number], HelpFieldDef[]> = {
  start: [],
  api: [
    { labelKey: 'inspector.fields.method', descKey: 'pipelineEditor.help.nodes.api.fields.method' },
    { labelKey: 'inspector.fields.url', descKey: 'pipelineEditor.help.nodes.api.fields.url' },
    { labelKey: 'inspector.fields.headersJson', descKey: 'pipelineEditor.help.nodes.api.fields.headersRaw' },
    { labelKey: 'inspector.fields.bodyJson', descKey: 'pipelineEditor.help.nodes.api.fields.bodyRaw' },
    { labelKey: 'inspector.fields.outputPath', descKey: 'pipelineEditor.help.nodes.api.fields.outputPath' },
  ],
  setVariable: [
    { labelKey: 'inspector.fields.extractions', descKey: 'pipelineEditor.help.nodes.setVariable.fields.extractions' },
    { labelKey: 'inspector.fields.valueExtractPath', descKey: 'pipelineEditor.help.nodes.setVariable.fields.extractPath' },
    { labelKey: 'inspector.fields.variableName', descKey: 'pipelineEditor.help.nodes.setVariable.fields.variableName' },
  ],
  condition: [
    { labelKey: 'inspector.fields.leftPath', descKey: 'pipelineEditor.help.nodes.condition.fields.leftPath' },
    { labelKey: 'inspector.fields.operator', descKey: 'pipelineEditor.help.nodes.condition.fields.operator' },
    { labelKey: 'inspector.fields.aggregation', descKey: 'pipelineEditor.help.nodes.condition.fields.aggregation' },
    { labelKey: 'inspector.fields.rightType', descKey: 'pipelineEditor.help.nodes.condition.fields.rightType' },
    { labelKey: 'inspector.fields.rightValue', descKey: 'pipelineEditor.help.nodes.condition.fields.rightValue' },
  ],
  filter: [
    { labelKey: 'inspector.fields.sourcePath', descKey: 'pipelineEditor.help.nodes.filter.fields.sourcePath' },
    { labelKey: 'inspector.fields.itemPath', descKey: 'pipelineEditor.help.nodes.filter.fields.itemPath' },
    { labelKey: 'inspector.fields.operator', descKey: 'pipelineEditor.help.nodes.filter.fields.operator' },
    { labelKey: 'inspector.fields.rightType', descKey: 'pipelineEditor.help.nodes.filter.fields.rightType' },
    { labelKey: 'inspector.fields.rightValue', descKey: 'pipelineEditor.help.nodes.filter.fields.rightValue' },
    { labelKey: 'inspector.fields.outputPath', descKey: 'pipelineEditor.help.nodes.filter.fields.outputPath' },
    { labelKey: 'inspector.fields.outputPathRejected', descKey: 'pipelineEditor.help.nodes.filter.fields.outputPathRejected' },
  ],
  transform: [
    { labelKey: 'inspector.fields.mode', descKey: 'pipelineEditor.help.nodes.transform.fields.mode' },
    { labelKey: 'inspector.fields.sourcePath', descKey: 'pipelineEditor.help.nodes.transform.fields.sourcePath' },
    { labelKey: 'inspector.fields.targetPath', descKey: 'pipelineEditor.help.nodes.transform.fields.targetPath' },
    { labelKey: 'inspector.fields.literalValue', descKey: 'pipelineEditor.help.nodes.transform.fields.literalValue' },
  ],
  output: [
    { labelKey: 'inspector.fields.outputPath', descKey: 'pipelineEditor.help.nodes.output.fields.outputPath' },
  ],
}

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const selectedExample = ref<'example1' | 'example2'>('example1')

const helpExampleSteps = computed((): HelpStep[] => [
  {
    type: 'start',
    title: t('pipelineEditor.help.nodes.start.title'),
    noConfig: true,
  },
  {
    type: 'api',
    title: t('pipelineEditor.help.nodes.api.title'),
    fields: [
      { label: t('inspector.fields.method'), value: 'GET' },
      { label: 'URL', value: 'https://jsonplaceholder.typicode.com/todos/1' },
      { label: t('inspector.fields.headersJson'), value: t('pipelineEditor.help.exampleSteps.empty') },
      { label: t('inspector.fields.bodyJson'), value: t('pipelineEditor.help.exampleSteps.empty') },
      { label: t('inspector.fields.outputPath'), value: '$.todo' },
    ],
  },
  {
    type: 'condition',
    title: t('pipelineEditor.help.nodes.condition.title'),
    fields: [
      { label: t('inspector.fields.leftPath'), value: '$.todo.completed' },
      { label: t('inspector.fields.operator'), value: t('inspector.options.conditionOperator.equals') },
      { label: t('inspector.fields.aggregation'), value: t('inspector.options.conditionAggregation.any') },
      { label: t('inspector.fields.rightType'), value: t('inspector.options.rightType.boolean') },
      { label: t('inspector.fields.rightValue'), value: 'true' },
    ],
    branches: {
      true: {
        label: t('pipelineEditor.help.exampleSteps.branchTrue'),
        fields: [
          { label: t('inspector.fields.mode'), value: t('inspector.options.transformMode.pickPath') },
          { label: t('inspector.fields.sourcePath'), value: '$.todo.title' },
          { label: t('inspector.fields.targetPath'), value: '$.result' },
        ],
      },
      false: {
        label: t('pipelineEditor.help.exampleSteps.branchFalse'),
        fields: [
          { label: t('inspector.fields.mode'), value: t('inspector.options.transformMode.assignLiteral') },
          { label: t('inspector.fields.literalValue'), value: t('pipelineEditor.help.exampleSteps.taskNotDone') },
          { label: t('inspector.fields.targetPath'), value: '$.result' },
        ],
      },
    },
  },
  {
    type: 'output',
    title: t('pipelineEditor.help.nodes.output.title'),
    fields: [
      { label: t('inspector.fields.outputPath'), value: '$.result' },
    ],
  },
])

const helpExample2Steps = computed((): HelpStep[] => [
  {
    type: 'start',
    title: t('pipelineEditor.help.nodes.start.title'),
    noConfig: true,
  },
  {
    type: 'api',
    title: t('pipelineEditor.help.nodes.api.title'),
    fields: [
      { label: t('inspector.fields.method'), value: 'GET' },
      { label: 'URL', value: 'https://jsonplaceholder.typicode.com/users' },
      { label: t('inspector.fields.headersJson'), value: t('pipelineEditor.help.exampleSteps.empty') },
      { label: t('inspector.fields.bodyJson'), value: t('pipelineEditor.help.exampleSteps.empty') },
      { label: t('inspector.fields.outputPath'), value: '$.users' },
    ],
  },
  {
    type: 'transform',
    title: t('pipelineEditor.help.nodes.transform.title'),
    fields: [
      { label: t('inspector.fields.mode'), value: t('inspector.options.transformMode.assignLiteral') },
      { label: t('inspector.fields.literalValue'), value: 'true' },
      { label: t('inspector.fields.targetPath'), value: '$.users[*].active' },
    ],
  },
  {
    type: 'output',
    title: t('pipelineEditor.help.nodes.output.title'),
    fields: [
      { label: t('inspector.fields.outputPath'), value: '$.users' },
    ],
  },
])
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="t('pipelineEditor.help.title')"
    :modal="true"
    style="width: min(860px, 94vw)"
  >
    <div class="help-content">
      <section class="help-section">
        <h3 class="help-section-title">{{ t('pipelineEditor.help.section1Title') }}</h3>
        <Tabs :value="helpNodeKeys[0]">
          <TabList>
            <Tab v-for="nodeKey in helpNodeKeys" :key="nodeKey" :value="nodeKey">
              {{ t(`pipelineEditor.help.nodes.${nodeKey}.title`) }}
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel v-for="nodeKey in helpNodeKeys" :key="nodeKey" :value="nodeKey">
              <div class="help-node-panel">
                <p class="help-node-desc">{{ t(`pipelineEditor.help.nodes.${nodeKey}.desc`) }}</p>

                <p v-if="helpNodeFieldDefs[nodeKey].length === 0" class="help-node-nofields">
                  {{ t(`pipelineEditor.help.nodes.${nodeKey}.noFields`) }}
                </p>
                <table v-else class="help-node-fields-table">
                  <tbody>
                    <tr v-for="field in helpNodeFieldDefs[nodeKey]" :key="field.labelKey">
                      <th>{{ t(field.labelKey) }}</th>
                      <td>{{ t(field.descKey) }}</td>
                    </tr>
                  </tbody>
                </table>

                <div class="help-node-example">
                  <span class="help-example-tag">{{ t('pipelineEditor.help.exampleLabel') }}</span>
                  <code class="help-example-code">{{ t(`pipelineEditor.help.nodes.${nodeKey}.example`) }}</code>
                </div>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </section>

      <section class="help-section">
        <h3 class="help-section-title">{{ t('pipelineEditor.help.section2Title') }}</h3>
        <Tabs v-model:value="selectedExample">
          <TabList>
            <Tab value="example1">{{ t('pipelineEditor.help.example1Title') }}</Tab>
            <Tab value="example2">{{ t('pipelineEditor.help.example2Title') }}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel value="example1">
              <p class="help-example-intro">{{ t('pipelineEditor.help.exampleIntro') }}</p>
              <div class="help-ex-flow">
                <template v-for="(step, i) in helpExampleSteps" :key="step.type">
                  <div v-if="i > 0" class="help-ex-arrow">↓</div>

                  <div :class="['help-ex-card', `help-ex-card--${step.type}`]">
                    <div class="help-ex-card-header">
                      <span :class="['help-node-badge', `help-node-badge--${step.type}`]">{{ step.title }}</span>
                    </div>
                    <p v-if="step.noConfig" class="help-ex-noconfig">{{ t('pipelineEditor.help.exampleSteps.noConfig') }}</p>
                    <table v-else-if="step.fields?.length" class="help-ex-table">
                      <tbody>
                        <tr v-for="field in step.fields" :key="field.label">
                          <th>{{ field.label }}</th>
                          <td><code>{{ field.value }}</code></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <template v-if="step.branches">
                    <div class="help-ex-arrow">↓</div>
                    <div class="help-ex-branches">
                      <div
                        v-for="(branch, bKey) in step.branches"
                        :key="bKey"
                        class="help-ex-branch"
                      >
                        <div :class="['help-branch-label', `help-branch-label--${bKey}`]">{{ branch.label }}</div>
                        <div class="help-ex-card help-ex-card--transform">
                          <div class="help-ex-card-header">
                            <span class="help-node-badge help-node-badge--transform">{{ t('pipelineEditor.help.nodes.transform.title') }}</span>
                          </div>
                          <table class="help-ex-table">
                            <tbody>
                              <tr v-for="field in branch.fields" :key="field.label">
                                <th>{{ field.label }}</th>
                                <td><code>{{ field.value }}</code></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </template>
                </template>
              </div>
            </TabPanel>

            <TabPanel value="example2">
              <p class="help-example-intro">{{ t('pipelineEditor.help.example2Intro') }}</p>
              <div class="help-ex-flow">
                <template v-for="(step, i) in helpExample2Steps" :key="step.type">
                  <div v-if="i > 0" class="help-ex-arrow">↓</div>

                  <div :class="['help-ex-card', `help-ex-card--${step.type}`]">
                    <div class="help-ex-card-header">
                      <span :class="['help-node-badge', `help-node-badge--${step.type}`]">{{ step.title }}</span>
                    </div>
                    <p v-if="step.noConfig" class="help-ex-noconfig">{{ t('pipelineEditor.help.exampleSteps.noConfig') }}</p>
                    <table v-else-if="step.fields?.length" class="help-ex-table">
                      <tbody>
                        <tr v-for="field in step.fields" :key="field.label">
                          <th>{{ field.label }}</th>
                          <td><code>{{ field.value }}</code></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </template>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </section>

      <section class="help-section">
        <h3 class="help-section-title">{{ t('pipelineEditor.help.section3Title') }}</h3>
        <p class="help-example-intro">{{ t('pipelineEditor.help.conditionArray.intro') }}</p>
        <table class="help-node-fields-table">
          <tbody>
            <tr>
              <th>{{ t('pipelineEditor.help.conditionArray.wildcardLabel') }}</th>
              <td>{{ t('pipelineEditor.help.conditionArray.wildcardDesc') }}</td>
            </tr>
            <tr>
              <th>{{ t('inspector.options.conditionAggregation.any') }}</th>
              <td>{{ t('pipelineEditor.help.conditionArray.anyDesc') }}</td>
            </tr>
            <tr>
              <th>{{ t('inspector.options.conditionAggregation.all') }}</th>
              <td>{{ t('pipelineEditor.help.conditionArray.allDesc') }}</td>
            </tr>
            <tr>
              <th>{{ t('inspector.options.conditionAggregation.none') }}</th>
              <td>{{ t('pipelineEditor.help.conditionArray.noneDesc') }}</td>
            </tr>
            <tr>
              <th>{{ t('pipelineEditor.help.conditionArray.examplesLabel') }}</th>
              <td>{{ t('pipelineEditor.help.conditionArray.examplesDesc') }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </Dialog>
</template>

<style scoped>
.help-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-height: 74vh;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.help-section-title {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}

.help-node-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.25rem 0;
}

.help-node-badge {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.2em 0.6em;
  border-radius: 6px;
}

.help-node-badge--start { background: #d1fae5; color: #065f46; }
.help-node-badge--api { background: #dbeafe; color: #1e40af; }
.help-node-badge--condition { background: #fef3c7; color: #92400e; }
.help-node-badge--transform { background: #ede9fe; color: #4c1d95; }
.help-node-badge--output { background: #fee2e2; color: #991b1b; }

.help-node-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-soft);
  line-height: 1.5;
}

.help-node-nofields {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-soft);
  font-style: italic;
}

.help-node-fields-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  border: 1px solid var(--border);
  border-radius: 7px;
  overflow: hidden;
}

.help-node-fields-table tr + tr {
  border-top: 1px solid var(--border);
}

.help-node-fields-table th {
  width: 35%;
  padding: 0.38rem 0.65rem;
  font-weight: 600;
  color: var(--text-soft);
  text-align: left;
  white-space: nowrap;
  background: var(--surface-hover, rgba(0, 0, 0, 0.025));
  vertical-align: top;
}

.help-node-fields-table td {
  padding: 0.38rem 0.65rem;
  color: var(--text);
  line-height: 1.45;
  vertical-align: top;
}

.help-node-example {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.help-example-tag {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-soft);
}

.help-example-code {
  font-size: 0.78rem;
  background: var(--surface-hover, rgba(0, 0, 0, 0.04));
  border-radius: 5px;
  padding: 0.35em 0.55em;
  line-height: 1.5;
  word-break: break-all;
}

.help-example-intro {
  margin: 0 0 1rem;
  color: var(--text-soft);
  font-size: 0.88rem;
}

.help-ex-flow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  width: 100%;
}

.help-ex-arrow {
  font-size: 1.1rem;
  color: var(--text-soft);
  line-height: 1.8;
}

.help-ex-card {
  width: 100%;
  max-width: 640px;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.help-ex-card--start { border-color: #6ee7b7; }
.help-ex-card--api { border-color: #93c5fd; }
.help-ex-card--condition { border-color: #fcd34d; }
.help-ex-card--transform { border-color: #c4b5fd; }
.help-ex-card--output { border-color: #fca5a5; }

.help-ex-card-header {
  padding: 0.5rem 0.85rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface-hover, rgba(0, 0, 0, 0.03));
}

.help-ex-noconfig {
  margin: 0;
  padding: 0.6rem 0.85rem;
  font-size: 0.82rem;
  color: var(--text-soft);
  font-style: italic;
}

.help-ex-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.83rem;
}

.help-ex-table tr + tr {
  border-top: 1px solid var(--border);
}

.help-ex-table th {
  width: 40%;
  padding: 0.42rem 0.85rem;
  font-weight: 600;
  color: var(--text-soft);
  text-align: left;
  white-space: nowrap;
}

.help-ex-table td {
  padding: 0.42rem 0.85rem;
}

.help-ex-table code {
  font-size: 0.82rem;
  background: var(--surface-hover, rgba(0, 0, 0, 0.04));
  border-radius: 4px;
  padding: 0.15em 0.45em;
  word-break: break-all;
}

.help-ex-branches {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  width: 100%;
  max-width: 640px;
  margin: 0.15rem 0;
}

.help-ex-branch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.help-branch-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.15em 0.55em;
  border-radius: 5px;
}

.help-branch-label--true { background: #d1fae5; color: #065f46; }
.help-branch-label--false { background: #fee2e2; color: #991b1b; }
</style>
