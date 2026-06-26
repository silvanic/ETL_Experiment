<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const shortcuts = computed(() => [
  { key: 'Click', desc: t('pipelineEditor.help.multiselection.shortcuts.singleSelect') },
  { key: 'Ctrl/Cmd + Click', desc: t('pipelineEditor.help.multiselection.shortcuts.toggleSelect') },
  { key: 'Shift + Click', desc: t('pipelineEditor.help.multiselection.shortcuts.addSelect') },
  { key: 'Ctrl/Cmd + A', desc: t('pipelineEditor.help.multiselection.shortcuts.selectAll') },
  { key: 'Ctrl/Cmd + C', desc: t('pipelineEditor.help.multiselection.shortcuts.copy') },
  { key: 'Ctrl/Cmd + V', desc: t('pipelineEditor.help.multiselection.shortcuts.paste') },
  { key: 'Ctrl/Cmd + X', desc: t('pipelineEditor.help.multiselection.shortcuts.cut') },
  { key: 'Ctrl/Cmd + D', desc: t('pipelineEditor.help.multiselection.shortcuts.duplicate') },
])

const operations = computed(() => [
  {
    title: t('pipelineEditor.help.multiselection.operations.copy'),
    desc: t('pipelineEditor.help.multiselection.operations.copyDesc'),
  },
  {
    title: t('pipelineEditor.help.multiselection.operations.paste'),
    desc: t('pipelineEditor.help.multiselection.operations.pasteDesc'),
  },
  {
    title: t('pipelineEditor.help.multiselection.operations.cut'),
    desc: t('pipelineEditor.help.multiselection.operations.cutDesc'),
  },
  {
    title: t('pipelineEditor.help.multiselection.operations.duplicate'),
    desc: t('pipelineEditor.help.multiselection.operations.duplicateDesc'),
  },
  {
    title: t('pipelineEditor.help.multiselection.operations.delete'),
    desc: t('pipelineEditor.help.multiselection.operations.deleteDesc'),
  },
])
</script>

<template>
  <article class="doc-page">
    <h2>{{ t('pipelineEditor.help.multiselection.title') }}</h2>
    <p class="doc-lead">{{ t('pipelineEditor.help.multiselection.subtitle') }}</p>

    <section class="doc-section">
      <h3>{{ t('pipelineEditor.help.multiselection.selectionTitle') }}</h3>
      <p>{{ t('pipelineEditor.help.multiselection.selectionDesc') }}</p>
      <ul>
        <li><strong>{{ t('pipelineEditor.help.multiselection.selectSingle') }}</strong>: {{ t('pipelineEditor.help.multiselection.selectSingleDesc') }}</li>
        <li><strong>Ctrl/Cmd + Click</strong>: {{ t('pipelineEditor.help.multiselection.toggleSelectDesc') }}</li>
        <li><strong>Shift + Click</strong>: {{ t('pipelineEditor.help.multiselection.addSelectDesc') }}</li>
        <li><strong>Ctrl/Cmd + A</strong>: {{ t('pipelineEditor.help.multiselection.selectAllDesc') }}</li>
      </ul>
    </section>

    <section class="doc-section">
      <h3>{{ t('pipelineEditor.help.multiselection.operationsTitle') }}</h3>
      <p>{{ t('pipelineEditor.help.multiselection.operationsDesc') }}</p>
      <div class="operations-list">
        <div v-for="op in operations" :key="op.title" class="operation-item">
          <h4>{{ op.title }}</h4>
          <p>{{ op.desc }}</p>
        </div>
      </div>
    </section>

    <section class="doc-section">
      <h3>{{ t('pipelineEditor.help.multiselection.shortcutsTitle') }}</h3>
      <p>{{ t('pipelineEditor.help.multiselection.shortcutsDesc') }}</p>
      <table class="shortcuts-table">
        <thead>
          <tr>
            <th>{{ t('pipelineEditor.help.multiselection.shortcutKey') }}</th>
            <th>{{ t('pipelineEditor.help.multiselection.shortcutAction') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sc in shortcuts" :key="sc.key">
            <td class="key-cell"><code>{{ sc.key }}</code></td>
            <td>{{ sc.desc }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="doc-section">
      <h3>{{ t('pipelineEditor.help.multiselection.tipTitle') }}</h3>
      <ul>
        <li>{{ t('pipelineEditor.help.multiselection.tip1') }}</li>
        <li>{{ t('pipelineEditor.help.multiselection.tip2') }}</li>
        <li>{{ t('pipelineEditor.help.multiselection.tip3') }}</li>
      </ul>
    </section>

    <section class="doc-section">
      <h3>{{ t('pipelineEditor.help.multiselection.basicExample') }}</h3>
      <p>{{ t('pipelineEditor.help.multiselection.basicExampleIntro') }}</p>
      <div class="example-box">
        <ol>
          <li>{{ t('pipelineEditor.help.multiselection.basicExampleStep1') }}</li>
          <li>{{ t('pipelineEditor.help.multiselection.basicExampleStep2') }}</li>
          <li>{{ t('pipelineEditor.help.multiselection.basicExampleStep3') }}</li>
          <li>{{ t('pipelineEditor.help.multiselection.basicExampleStep4') }}</li>
          <li>{{ t('pipelineEditor.help.multiselection.basicExampleStep5') }}</li>
        </ol>
        <p class="example-note"><strong>💡 Astuce:</strong> {{ t('pipelineEditor.help.multiselection.basicExampleTip') }}</p>
      </div>
    </section>

    <section class="doc-section">
      <h3>{{ t('pipelineEditor.help.multiselection.useCasesTitle') }}</h3>
      <p>{{ t('pipelineEditor.help.multiselection.useCasesDesc') }}</p>
      
      <div class="use-case-item">
        <h4>{{ t('pipelineEditor.help.multiselection.useCase1Title') }}</h4>
        <p>{{ t('pipelineEditor.help.multiselection.useCase1Desc') }}</p>
        <div class="workflow-example">
          <span class="workflow-step">Requête API</span>
          <span class="workflow-arrow">→</span>
          <span class="workflow-step">Condition</span>
          <span class="workflow-arrow">→</span>
          <span class="workflow-step">Transform</span>
          <span class="workflow-arrow">→</span>
          <span class="workflow-step">Output</span>
        </div>
        <p class="workflow-note">{{ t('pipelineEditor.help.multiselection.useCase1Action') }}</p>
      </div>

      <div class="use-case-item">
        <h4>{{ t('pipelineEditor.help.multiselection.useCase2Title') }}</h4>
        <p>{{ t('pipelineEditor.help.multiselection.useCase2Desc') }}</p>
        <div class="workflow-example">
          <span class="workflow-step">API-1</span>
          <span class="workflow-arrow">→</span>
          <span class="workflow-step">Transform</span>
          <span class="workflow-arrow">→</span>
          <span class="workflow-step">Output-1</span>
        </div>
        <p class="workflow-note">{{ t('pipelineEditor.help.multiselection.useCase2Action') }}</p>
      </div>

      <div class="use-case-item">
        <h4>{{ t('pipelineEditor.help.multiselection.useCase3Title') }}</h4>
        <p>{{ t('pipelineEditor.help.multiselection.useCase3Desc') }}</p>
        <p class="workflow-note">{{ t('pipelineEditor.help.multiselection.useCase3Action') }}</p>
      </div>
    </section>

    <section class="doc-section">
      <h3>{{ t('pipelineEditor.help.multiselection.benefitsTitle') }}</h3>
      <ul class="benefits-list">
        <li>
          <strong>{{ t('pipelineEditor.help.multiselection.benefit1Title') }}</strong>
          <p>{{ t('pipelineEditor.help.multiselection.benefit1Desc') }}</p>
        </li>
        <li>
          <strong>{{ t('pipelineEditor.help.multiselection.benefit2Title') }}</strong>
          <p>{{ t('pipelineEditor.help.multiselection.benefit2Desc') }}</p>
        </li>
        <li>
          <strong>{{ t('pipelineEditor.help.multiselection.benefit3Title') }}</strong>
          <p>{{ t('pipelineEditor.help.multiselection.benefit3Desc') }}</p>
        </li>
        <li>
          <strong>{{ t('pipelineEditor.help.multiselection.benefit4Title') }}</strong>
          <p>{{ t('pipelineEditor.help.multiselection.benefit4Desc') }}</p>
        </li>
      </ul>
    </section>

    <section class="doc-section">
      <h3>{{ t('pipelineEditor.help.multiselection.learnMore') }}</h3>
      <ul>
        <li>
          <RouterLink :to="{ name: 'help-node', params: { nodeKey: 'start' } }">
            {{ t('pipelineEditor.help.multiselection.learnMoreNodes') }}
          </RouterLink>
        </li>
        <li>
          <RouterLink :to="{ name: 'help-example', params: { exampleId: 'request-condition-transform' } }">
            {{ t('pipelineEditor.help.multiselection.learnMoreExamples') }}
          </RouterLink>
        </li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.doc-page h2 {
  margin: 0;
  font-size: 1.2rem;
}

.doc-section h3 {
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
}

.doc-section ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  list-style: disc;
}

.doc-section li {
  margin: 0.4rem 0;
  line-height: 1.5;
}

.operations-list {
  display: grid;
  gap: 1rem;
  margin: 1rem 0;
}

.operation-item {
  padding: 0.8rem;
  border-left: 3px solid var(--primary-color);
  background-color: var(--surface-50);
  border-radius: 0.25rem;
}

.operation-item h4 {
  margin: 0 0 0.3rem 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.operation-item p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
  color: var(--text-color);
}

.shortcuts-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 0.9rem;
}

.shortcuts-table thead {
  background-color: var(--surface-100);
}

.shortcuts-table th,
.shortcuts-table td {
  padding: 0.6rem;
  text-align: left;
  border-bottom: 1px solid var(--surface-border);
}

.shortcuts-table th {
  font-weight: 600;
  color: var(--text-color);
}

.shortcuts-table tr:hover {
  background-color: var(--surface-50);
}

.key-cell {
  font-family: monospace;
  background-color: var(--surface-100);
  border-radius: 0.25rem;
  font-weight: 500;
}

code {
  background-color: var(--surface-100);
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.9em;
}

.example-box {
  margin: 1.5rem 0;
  padding: 1rem;
  border-left: 4px solid var(--primary-color);
  background-color: color-mix(in srgb, var(--primary-color) 10%, transparent);
  border-radius: 0.4rem;
}

.example-box ol {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.example-box li {
  margin: 0.6rem 0;
  line-height: 1.6;
}

.example-note {
  margin-top: 1rem;
  padding: 0.8rem;
  background-color: var(--surface-100);
  border-radius: 0.25rem;
  font-size: 0.9rem;
  font-style: italic;
}

.doc-section a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.2s;
}

.doc-section a:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.use-case-item {
  margin: 1.5rem 0;
  padding: 1rem;
  border-left: 4px solid var(--accent-color);
  background-color: color-mix(in srgb, var(--accent-color) 8%, transparent);
  border-radius: 0.4rem;
}

.use-case-item h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.use-case-item p {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

.workflow-example {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem 0;
  padding: 0.8rem;
  background-color: var(--surface-100);
  border-radius: 0.25rem;
  font-size: 0.85rem;
  overflow-x: auto;
}

.workflow-step {
  padding: 0.4rem 0.6rem;
  background-color: var(--primary-color);
  color: white;
  border-radius: 0.25rem;
  font-weight: 500;
  white-space: nowrap;
}

.workflow-arrow {
  color: var(--text-soft);
  font-weight: bold;
}

.workflow-note {
  margin: 0.8rem 0 0 0 !important;
  padding: 0.6rem;
  background-color: var(--surface-50);
  border-radius: 0.25rem;
  font-size: 0.85rem;
  font-style: italic;
  color: var(--text-soft);
}

.benefits-list {
  list-style: none;
  margin: 1rem 0;
  padding: 0;
}

.benefits-list li {
  margin: 1.2rem 0;
  padding: 1rem;
  border-left: 3px solid var(--primary-color);
  background-color: var(--surface-50);
  border-radius: 0.25rem;
}

.benefits-list li strong {
  display: block;
  margin-bottom: 0.4rem;
  color: var(--primary-color);
}

.benefits-list li p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--text-color);
}
</style>
