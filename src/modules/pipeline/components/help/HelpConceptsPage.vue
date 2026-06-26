<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const principles = computed(() => [
  {
    title: t('pipelineEditor.help.concepts.principles.p1Title'),
    desc: t('pipelineEditor.help.concepts.principles.p1Desc'),
  },
  {
    title: t('pipelineEditor.help.concepts.principles.p2Title'),
    desc: t('pipelineEditor.help.concepts.principles.p2Desc'),
  },
  {
    title: t('pipelineEditor.help.concepts.principles.p3Title'),
    desc: t('pipelineEditor.help.concepts.principles.p3Desc'),
  },
  {
    title: t('pipelineEditor.help.concepts.principles.p4Title'),
    desc: t('pipelineEditor.help.concepts.principles.p4Desc'),
  },
  {
    title: t('pipelineEditor.help.concepts.principles.p5Title'),
    desc: t('pipelineEditor.help.concepts.principles.p5Desc'),
  },
])

const patterns = computed(() => [
  {
    title: t('pipelineEditor.help.concepts.patterns.linearTitle'),
    desc: t('pipelineEditor.help.concepts.patterns.linearDesc'),
  },
  {
    title: t('pipelineEditor.help.concepts.patterns.branchingTitle'),
    desc: t('pipelineEditor.help.concepts.patterns.branchingDesc'),
  },
  {
    title: t('pipelineEditor.help.concepts.patterns.enrichmentTitle'),
    desc: t('pipelineEditor.help.concepts.patterns.enrichmentDesc'),
  },
  {
    title: t('pipelineEditor.help.concepts.patterns.guardrailTitle'),
    desc: t('pipelineEditor.help.concepts.patterns.guardrailDesc'),
  },
  {
    title: t('pipelineEditor.help.concepts.patterns.fallbackTitle'),
    desc: t('pipelineEditor.help.concepts.patterns.fallbackDesc'),
  },
])

const antiPatternsInline = computed(() => [
  t('pipelineEditor.help.concepts.antipatterns.a1'),
  t('pipelineEditor.help.concepts.antipatterns.a2'),
  t('pipelineEditor.help.concepts.antipatterns.a3'),
  t('pipelineEditor.help.concepts.antipatterns.a4'),
].join(' • '))
</script>

<template>
  <article class="doc-page">
    <h2>{{ t('pipelineEditor.help.concepts.title') }}</h2>
    <p class="doc-lead">{{ t('pipelineEditor.help.concepts.subtitle') }}</p>

    <section class="doc-section doc-section--intro">
      <h3>{{ t('pipelineEditor.help.concepts.narrativeTitle') }}</h3>
      <p>{{ t('pipelineEditor.help.concepts.narrativeP1') }}</p>
      <p>{{ t('pipelineEditor.help.concepts.narrativeP2') }}</p>
      <p>{{ t('pipelineEditor.help.concepts.narrativeP3') }}</p>
    </section>

    <section class="doc-section">
      <h3>{{ t('pipelineEditor.help.concepts.whatIsTitle') }}</h3>
      <p>{{ t('pipelineEditor.help.concepts.whatIsDesc') }}</p>
    </section>

    <section class="doc-section">
      <h3>{{ t('pipelineEditor.help.concepts.principlesTitle') }}</h3>
      <p>{{ t('pipelineEditor.help.concepts.principlesIntro') }}</p>
      <div class="concept-grid">
        <article v-for="item in principles" :key="item.title" class="concept-card">
          <strong>{{ item.title }}</strong>
          <p>{{ item.desc }}</p>
        </article>
      </div>
    </section>

    <section class="doc-section">
      <h3>{{ t('pipelineEditor.help.concepts.patternsTitle') }}</h3>
      <p>{{ t('pipelineEditor.help.concepts.patternsIntro') }}</p>
      <div class="concept-grid concept-grid--compact">
        <article v-for="item in patterns" :key="item.title" class="concept-card concept-card--soft">
          <strong>{{ item.title }}</strong>
          <p>{{ item.desc }}</p>
        </article>
      </div>
    </section>

    <section class="doc-section">
      <h3>{{ t('pipelineEditor.help.concepts.antipatternsTitle') }}</h3>
      <p>{{ t('pipelineEditor.help.concepts.antipatternsIntro') }}</p>
      <p class="inline-list">{{ antiPatternsInline }}</p>
    </section>

    <section class="doc-section">
      <h3>{{ t('pipelineEditor.help.concepts.methodTitle') }}</h3>
      <p>{{ t('pipelineEditor.help.concepts.methodIntro') }}</p>
      <ol class="method-list">
        <li>{{ t('pipelineEditor.help.concepts.method.m1') }}</li>
        <li>{{ t('pipelineEditor.help.concepts.method.m2') }}</li>
        <li>{{ t('pipelineEditor.help.concepts.method.m3') }}</li>
        <li>{{ t('pipelineEditor.help.concepts.method.m4') }}</li>
        <li>{{ t('pipelineEditor.help.concepts.method.m5') }}</li>
        <li>{{ t('pipelineEditor.help.concepts.method.m6') }}</li>
      </ol>
    </section>

    <section class="doc-section">
      <h3>{{ t('pipelineEditor.help.concepts.checklistTitle') }}</h3>
      <p>{{ t('pipelineEditor.help.concepts.checklistIntro') }}</p>
      <ul>
        <li>{{ t('pipelineEditor.help.concepts.checklist.c1') }}</li>
        <li>{{ t('pipelineEditor.help.concepts.checklist.c2') }}</li>
        <li>{{ t('pipelineEditor.help.concepts.checklist.c3') }}</li>
        <li>{{ t('pipelineEditor.help.concepts.checklist.c4') }}</li>
        <li>{{ t('pipelineEditor.help.concepts.checklist.c5') }}</li>
        <li>{{ t('pipelineEditor.help.concepts.checklist.c6') }}</li>
      </ul>
    </section>

    <section class="doc-section doc-section--closing">
      <p>{{ t('pipelineEditor.help.concepts.closing') }}</p>
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

.doc-lead {
  margin: 0;
  color: var(--text-soft);
}

.doc-section {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.9rem;
  background: var(--panel);
}

.doc-section h3 {
  margin: 0 0 0.55rem;
  font-size: 0.95rem;
}

.doc-section p {
  margin: 0.35rem 0 0;
  line-height: 1.5;
}

.doc-section ul,
.method-list {
  margin: 0.6rem 0 0;
  padding-left: 1.2rem;
}

.doc-section li + li {
  margin-top: 0.3rem;
}

.doc-section--intro {
  border-left: 4px solid var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 9%, var(--panel));
}

.concept-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.7rem;
  margin-top: 0.65rem;
}

.concept-grid--compact {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.concept-card {
  padding: 0.8rem;
  border-left: 3px solid var(--primary-color);
  background: var(--surface-50);
  border-radius: 0.25rem;
}

.concept-card--soft {
  border-left-color: var(--accent-color);
}

.concept-card strong {
  display: block;
  margin-bottom: 0.3rem;
}

.concept-card p {
  margin: 0;
  color: var(--text-soft);
}

.inline-list {
  color: var(--text-soft);
}

.doc-section--closing {
  border-left: 4px solid var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 8%, var(--panel));
}
</style>
