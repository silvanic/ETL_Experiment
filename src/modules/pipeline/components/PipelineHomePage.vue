<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale, type AppLocale } from '@/i18n'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Carousel from 'primevue/carousel'
import Panel from 'primevue/panel'
import Divider from 'primevue/divider'
import Tag from 'primevue/tag'
import { pipelineTemplates } from '@/modules/pipeline/data/templates'
import changelogFr from '@/modules/pipeline/data/changelog_fr.json'
import changelogEn from '@/modules/pipeline/data/changelog_en.json'

const { t, locale } = useI18n()
const router = useRouter()

const switchLanguageLabel = computed(() =>
  locale.value === 'fr'
    ? t('pipelineEditor.language.switchToEn')
    : t('pipelineEditor.language.switchToFr'),
)

const languageInitials = computed(() => locale.value === 'fr' ? 'FR' : 'EN')

const keyPoints = computed(() => [
  {
    icon: 'pi pi-sitemap',
    text: t('pipelineEditor.home.points.visualBuilder'),
  },
  {
    icon: 'pi pi-play-circle',
    text: t('pipelineEditor.home.points.execution'),
  },
  {
    icon: 'pi pi-sliders-h',
    text: t('pipelineEditor.home.points.variables'),
  },
  {
    icon: 'pi pi-clone',
    text: t('pipelineEditor.home.points.templates'),
  },
])

const componentShowcase = computed(() => [
  {
    id: 'flow',
    icon: 'pi pi-sitemap',
    title: t('pipelineEditor.tabs.flow'),
    description: t('pipelineEditor.home.points.visualBuilder'),
  },
  {
    id: 'variables',
    icon: 'pi pi-sliders-h',
    title: t('pipelineEditor.tabs.variables'),
    description: t('pipelineEditor.home.points.variables'),
  },
  {
    id: 'console',
    icon: 'pi pi-terminal',
    title: t('pipelineEditor.tabs.console'),
    description: t('pipelineEditor.home.points.execution'),
  },
])

type ChangelogEntry = {
  version: string
  date: string
  sections: { title: string; features: string[] }[]
}

const changelogItems = computed<ChangelogEntry[]>(() => {
  const data = locale.value === 'fr' ? changelogFr : changelogEn
  return Object.entries(data).map(([version, info]) => ({
    version,
    date: (info as { date: string; sections: { title: string; features: string[] }[] }).date,
    sections: (info as { date: string; sections: { title: string; features: string[] }[] }).sections,
  }))
})

function openEditor(): void {
  router.push('/editor')
}

function scrollToTemplates(): void {
  const section = document.getElementById('templates-section')
  section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function toggleLanguage(): void {
  const nextLocale: AppLocale = locale.value === 'fr' ? 'en' : 'fr'
  setLocale(nextLocale)
}
</script>

<template>
  <main class="home-page">
    <div class="home-topbar">
      <Button
        :label="languageInitials"
        icon="pi pi-language"
        severity="secondary"
        text
        rounded
        :aria-label="switchLanguageLabel"
        v-tooltip.left="switchLanguageLabel"
        @click="toggleLanguage"
      />
    </div>

    <section class="hero-shell">
      <Card class="hero-card">
        <template #content>
          <div class="hero-content">
            <div class="hero-copy">
              <p class="hero-eyebrow">{{ t('pipelineEditor.eyebrow') }}</p>
              <h1 class="hero-title">{{ t('pipelineEditor.home.title') }}</h1>
              <p class="hero-description">{{ t('pipelineEditor.home.description') }}</p>

              <div class="hero-actions">
                <Button
                  icon="pi pi-play"
                  :label="t('pipelineEditor.home.openEditor')"
                  class="cta-primary"
                  severity="success"
                  outlined
                  size="large"
                  @click="openEditor"
                />
                <Button
                  icon="pi pi-th-large"
                  :label="t('pipelineEditor.home.templatesTitle')"
                  class="cta-secondary"
                  severity="secondary"
                  outlined
                  @click="scrollToTemplates"
                />
              </div>
            </div>

            <div class="hero-highlight">
              <Panel class="hero-highlight-panel">
                <template #header>
                  <div class="section-header">
                    <span>{{ t('pipelineEditor.home.getStartedTitle') }}</span>
                  </div>
                </template>
                <ol class="start-list">
                  <li>{{ t('pipelineEditor.home.steps.openEditor') }}</li>
                  <li>{{ t('pipelineEditor.home.steps.chooseTemplate') }}</li>
                  <li>{{ t('pipelineEditor.home.steps.runPipeline') }}</li>
                </ol>
                <div class="start-actions">
                  <Button
                    icon="pi pi-arrow-right"
                    :label="t('pipelineEditor.home.openEditor')"
                    class="cta-primary"
                    severity="success"
                    outlined
                    @click="openEditor"
                  />
                </div>
              </Panel>
            </div>
          </div>
        </template>
      </Card>
    </section>

    <Divider class="hero-divider" />

    <section class="hero-shell">
      <Panel class="home-section" toggleable>
        <template #header>
          <div class="section-header">
            <span>{{ t('pipelineEditor.home.whatItDoesTitle') }}</span>
          </div>
        </template>
        <div class="feature-grid">
          <Card v-for="point in keyPoints" :key="point.text" class="feature-card">
            <template #content>
              <div class="feature-content">
                <i :class="point.icon" aria-hidden="true" />
                <p>{{ point.text }}</p>
              </div>
            </template>
          </Card>
        </div>
      </Panel>

      <section id="templates-section">
        <Panel class="home-section" toggleable>
          <template #header>
            <div class="section-header">
              <span>{{ t('pipelineEditor.home.templatesTitle') }}</span>
            </div>
          </template>
          <div class="template-grid">
            <Card v-for="template in pipelineTemplates" :key="template.id" class="template-card">
              <template #title>
                <div class="template-title">
                  <span class="template-icon" aria-hidden="true">{{ template.icon }}</span>
                  <span>{{ t(template.nameKey) }}</span>
                </div>
              </template>
              <template #content>
                <p class="template-description">{{ t(template.descriptionKey) }}</p>
              </template>
            </Card>
          </div>
        </Panel>
      </section>

      <Panel class="home-section" toggleable>
        <template #header>
          <div class="section-header">
            <span>{{ t('pipelineEditor.whatsNew.title') }}</span>
            <Tag :value="changelogItems[0]?.version" severity="info" />
          </div>
        </template>
        <p class="component-showcase-intro">{{ t('pipelineEditor.whatsNew.intro') }}</p>
        <Carousel
          :value="changelogItems"
          :numVisible="1"
          :numScroll="1"
          circular
          class="changelog-carousel"
        >
          <template #item="slotProps">
            <div class="changelog-slide">
              <div class="changelog-slide-header">
                <span class="changelog-version">{{ slotProps.data.version }}</span>
                <span class="changelog-date">{{ slotProps.data.date }}</span>
              </div>
              <div class="changelog-sections">
                <div
                  v-for="section in slotProps.data.sections"
                  :key="section.title"
                  class="changelog-section"
                >
                  <p class="changelog-section-title">
                    <i class="pi pi-check-circle changelog-section-icon" aria-hidden="true" />
                    {{ section.title }}
                  </p>
                  <ul class="changelog-features">
                    <li v-for="feature in section.features" :key="feature">{{ feature }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </template>
        </Carousel>
      </Panel>

      <Panel class="home-section home-section--components">
        <template #header>
          <div class="section-header">
            <span>{{ t('pipelineEditor.home.componentsTitle') }}</span>
          </div>
        </template>
        <p class="component-showcase-intro">{{ t('pipelineEditor.home.componentsIntro') }}</p>
        <div class="component-showcase-grid">
          <Card
            v-for="component in componentShowcase"
            :key="component.id"
            class="component-showcase-card"
          >
            <template #content>
              <div class="component-showcase-head">
                <i :class="component.icon" class="component-showcase-icon" aria-hidden="true" />
                <h4 class="component-showcase-title">{{ component.title }}</h4>
              </div>
              <p class="component-showcase-description">{{ component.description }}</p>
            </template>
          </Card>
        </div>
        <div class="component-showcase-actions">
          <Button
            icon="pi pi-arrow-right"
            :label="t('pipelineEditor.home.openEditor')"
            class="cta-primary"
            severity="success"
            outlined
            @click="openEditor"
          />
          <Button
            icon="pi pi-th-large"
            :label="t('pipelineEditor.home.templatesTitle')"
            class="cta-secondary"
            severity="secondary"
            text
            @click="scrollToTemplates"
          />
        </div>
      </Panel>
    </section>
  </main>
</template>

<style scoped>
.home-page {
  --surface-main: var(--bg);
  --surface-card: var(--panel);
  --ink: var(--text);
  --ink-soft: var(--text-soft);
  min-height: 100vh;
  padding: clamp(1.2rem, 2.2vw, 2rem);
  background:
    radial-gradient(circle at 12% 15%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 28%),
    radial-gradient(circle at 88% 6%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 24%),
    linear-gradient(180deg, var(--surface-main) 0%, color-mix(in srgb, var(--surface-main) 92%, #ffffff) 100%);
  color: var(--ink);
  position: relative;
}

.home-topbar {
  max-width: 1180px;
  margin: 0 auto 0.6rem;
  display: flex;
  justify-content: flex-end;
}

.hero-shell,
.content-shell {
  max-width: 1180px;
  margin: 0 auto;
  width: 100%;
  position: relative;
  z-index: 1;
}

.content-shell {
  display: grid;
  gap: 1rem;
}

.hero-card :deep(.p-card) {
  border: 1px solid var(--border);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--surface-card) 88%, var(--accent) 12%) 0%, var(--surface-card) 58%),
    var(--surface-card);
  box-shadow: var(--shadow);
  border-radius: 14px;
}

.hero-card :deep(.p-card-body) {
  padding: clamp(1.1rem, 2.2vw, 1.6rem);
}

.hero-content {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(260px, 0.9fr);
  gap: clamp(0.9rem, 1.9vw, 1.4rem);
  align-items: stretch;
}

.hero-copy {
  display: grid;
  gap: 0.65rem;
  align-content: start;
}

.hero-eyebrow {
  margin: 0;
  color: var(--accent);
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-title {
  margin: 0;
  font-size: clamp(1.55rem, 3.2vw, 2.3rem);
  line-height: 1.15;
  max-width: 16ch;
  color: var(--ink);
}

.hero-description {
  margin: 0;
  max-width: 66ch;
  color: var(--ink-soft);
  font-size: 0.98rem;
  line-height: 1.55;
}

.hero-actions {
  margin-top: 0.45rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.cta-primary :deep(.p-button),
.cta-primary:deep(.p-button) {
  border-radius: 32px;
  font-weight: 600;
  padding-inline: 1rem;
}

.cta-secondary :deep(.p-button),
.cta-secondary:deep(.p-button) {
  border-radius: 10px;
}

.hero-highlight {
  display: flex;
  align-items: stretch;
}

.hero-highlight-panel {
  width: 100%;
}

.hero-highlight-panel :deep(.p-panel) {
  height: 100%;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface-card) 90%, var(--accent) 10%);
  border-radius: 14px;
}

.home-section :deep(.p-panel) {
  border: 1px solid var(--border);
  background: var(--surface-card);
  box-shadow: var(--shadow);
  border-radius: 14px;
  overflow: hidden;
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
}

.home-section :deep(.p-panel:hover) {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--border) 70%, var(--accent) 30%);
  box-shadow: 0 10px 24px rgba(20, 47, 79, 0.11);
}

.home-section :deep(.p-panel-header) {
  padding: 0.9rem 1rem;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--surface-card) 90%, var(--accent) 10%) 0%,
    var(--surface-card) 58%
  );
  border-bottom: 1px solid var(--border);
}

.home-section :deep(.p-panel-content) {
  padding: 1rem;
  background: var(--surface-card);
}

.section-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.75rem;
}

.feature-card :deep(.p-card) {
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--panel-soft, var(--surface-card)) 90%, var(--accent) 10%);
  border-radius: 14px;
  min-height: 100%;
  transition: border-color 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease;
}

.feature-card :deep(.p-card:hover) {
  border-color: color-mix(in srgb, var(--border) 68%, var(--accent) 32%);
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(20, 47, 79, 0.1);
}

.feature-card :deep(.p-card-body) {
  padding: 0.85rem;
}

.feature-content {
  display: grid;
  grid-template-columns: 1.6rem 1fr;
  gap: 0.7rem;
  align-items: start;
}

.feature-content i {
  color: var(--accent);
  margin-top: 0.12rem;
  font-size: 1.05rem;
}

.feature-content p {
  margin: 0;
  color: var(--ink);
  line-height: 1.55;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 0.75rem;
}

.template-card :deep(.p-card) {
  height: 100%;
  border: 1px solid var(--border);
  background: var(--surface-card);
  border-radius: 14px;
  transition: border-color 0.24s ease, transform 0.24s ease, box-shadow 0.24s ease;
}

.template-card :deep(.p-card:hover) {
  border-color: color-mix(in srgb, var(--border) 65%, var(--accent) 35%);
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(20, 47, 79, 0.1);
}

.template-card :deep(.p-card-body) {
  padding: 0.85rem;
}

.template-card :deep(.p-card-title) {
  margin: 0;
  color: var(--ink);
}

.template-title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.template-icon {
  font-size: 1.2rem;
}

.template-description {
  margin: 0;
  color: var(--ink-soft);
  line-height: 1.55;
}

/* ── Changelog Carousel ─────────────────────────────────────── */
.changelog-carousel {
    max-width: 1180px;
  margin-top: 0.85rem;
}

.changelog-carousel :deep(.p-carousel-item) {
  padding: 0 0.4rem;
}

.changelog-carousel :deep(.p-carousel-prev-button),
.changelog-carousel :deep(.p-carousel-next-button) {
  color: var(--accent);
}

.changelog-slide {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface-card) 96%, var(--accent) 4%);
  padding: 0.9rem 1rem;
  height: 100%;
  min-height: 240px;
  transition: border-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
}

.changelog-slide:hover {
  border-color: color-mix(in srgb, var(--border) 65%, var(--accent) 35%);
  box-shadow: 0 8px 22px rgba(20, 47, 79, 0.1);
  transform: translateY(-1px);
}

.changelog-slide-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid var(--border);
}

.changelog-version {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--accent);
  font-family: monospace;
}

.changelog-date {
  font-size: 0.8rem;
  color: var(--ink-soft);
}

.changelog-sections {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  overflow-y: auto;
  max-height: 340px;
}

.changelog-section-title {
  margin: 0 0 0.3rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.changelog-section-icon {
  color: var(--accent);
  font-size: 0.82rem;
  flex-shrink: 0;
}

.changelog-features {
  margin: 0;
  padding-left: 1.3rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.changelog-features li {
  font-size: 0.82rem;
  color: var(--ink-soft);
  line-height: 1.45;
}

/* ── Component Showcase ─────────────────────────────────────── */
.component-showcase-intro {
  margin: 0;
  color: var(--ink-soft);
  line-height: 1.55;
}

.component-showcase-grid {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.component-showcase-card :deep(.p-card) {
  border: 1px solid var(--border);
  background: var(--surface-card);
  border-radius: 14px;
  height: 100%;
}

.component-showcase-card :deep(.p-card-body) {
  padding: 0.85rem;
}

.component-showcase-head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.component-showcase-icon {
  color: var(--accent);
  font-size: 1rem;
}

.component-showcase-title {
  margin: 0;
  font-size: 0.96rem;
  font-weight: 600;
}

.component-showcase-description {
  margin: 0.45rem 0 0;
  color: var(--ink-soft);
  line-height: 1.5;
}

.start-list {
  margin: 0;
  padding-left: 1.15rem;
  display: grid;
  gap: 0.5rem;
}

.start-list li {
  color: var(--ink);
  line-height: 1.5;
}

.start-actions,
.component-showcase-actions {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.home-section--components :deep(.p-panel-content) {
  background: color-mix(in srgb, var(--surface-card) 88%, var(--accent) 12%);
}

.hero-divider :deep(.p-divider.p-component) {
  margin: clamp(0.95rem, 2vw, 1.35rem) auto;
  max-width: 1180px;
}

.hero-divider :deep(.p-divider .p-divider-content) {
  background: transparent;
  color: color-mix(in srgb, var(--ink-soft) 72%, var(--accent) 28%);
}

:deep(.p-tag) {
  border-radius: 999px;
}

@media (max-width: 960px) {
  .hero-content {
    grid-template-columns: 1fr;
  }

  .hero-title {
    max-width: none;
  }

  .hero-highlight {
    margin-top: 0.3rem;
  }
}

@media (max-width: 640px) {
  .home-page {
    padding: 1rem;
  }

  .home-section :deep(.p-panel-header),
  .home-section :deep(.p-panel-content) {
    padding-left: 0.85rem;
    padding-right: 0.85rem;
  }

  .hero-card :deep(.p-card-body) {
    padding: 1rem;
  }

  .hero-actions,
  .start-actions,
  .component-showcase-actions {
    width: 100%;
  }

  .hero-actions :deep(.p-button),
  .start-actions :deep(.p-button),
  .component-showcase-actions :deep(.p-button) {
    flex: 1 1 auto;
    justify-content: center;
  }
}
</style>
