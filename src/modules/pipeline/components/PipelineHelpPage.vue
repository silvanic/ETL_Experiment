<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale, type AppLocale } from '@/i18n'
import Button from 'primevue/button'
import Card from 'primevue/card'
import HelpBreadcrumb from '@/modules/pipeline/components/help/HelpBreadcrumb.vue'
import { helpNodeKeys } from '@/modules/pipeline/components/help/helpDocData'

const { t, locale } = useI18n()
const router = useRouter()

const switchLanguageLabel = computed(() =>
  locale.value === 'fr'
    ? t('pipelineEditor.language.switchToEn')
    : t('pipelineEditor.language.switchToFr'),
)

const languageInitials = computed(() => locale.value === 'fr' ? 'FR' : 'EN')
const overviewLabel = computed(() => locale.value === 'fr' ? 'Vue d\'ensemble' : 'Overview')
const nodeSectionLabel = computed(() => locale.value === 'fr' ? 'Noeuds' : 'Nodes')

function goToEditor(): void {
  router.push('/editor')
}

function goHome(): void {
  router.push('/')
}

function toggleLanguage(): void {
  const nextLocale: AppLocale = locale.value === 'fr' ? 'en' : 'fr'
  setLocale(nextLocale)
}
</script>

<template>
  <main class="help-page">
    <header class="help-topbar">
      <Button
        icon="pi pi-home"
        :label="t('pipelineEditor.eyebrow')"
        severity="secondary"
        text
        @click="goHome"
      />
      <div class="help-topbar-actions">
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
        <Button
          icon="pi pi-arrow-right"
          :label="t('pipelineEditor.home.openEditor')"
          severity="success"
          outlined
          @click="goToEditor"
        />
      </div>
    </header>

    <section class="help-shell">
      <Card class="help-card">
        <template #title>
          <div class="help-title-row">
            <i class="pi pi-question-circle" aria-hidden="true" />
            <h1>{{ t('pipelineEditor.help.title') }}</h1>
          </div>
        </template>
        <template #content>
          <div class="help-content-wrapper">
            <aside class="help-sidebar">
              <nav class="help-nav">
                <RouterLink class="help-nav-link" :to="{ name: 'help-overview' }">
                  {{ overviewLabel }}
                </RouterLink>

                <p class="help-nav-title">{{ t('pipelineEditor.help.guidesTitle') }}</p>
                <RouterLink class="help-nav-link help-nav-link--sub" :to="{ name: 'help-concepts' }">
                  {{ t('pipelineEditor.help.concepts.navTitle') }}
                </RouterLink>
                <RouterLink class="help-nav-link help-nav-link--sub" :to="{ name: 'help-multiselection' }">
                  {{ t('pipelineEditor.help.multiselection.navTitle') }}
                </RouterLink>

                <p class="help-nav-title">{{ nodeSectionLabel }}</p>
                <RouterLink
                  v-for="nodeKey in helpNodeKeys"
                  :key="nodeKey"
                  class="help-nav-link help-nav-link--sub"
                  :to="{ name: 'help-node', params: { nodeKey } }"
                >
                  {{ t(`pipelineEditor.help.nodes.${nodeKey}.title`) }}
                </RouterLink>

                <p class="help-nav-title">{{ t('pipelineEditor.help.section2Title') }}</p>
                <RouterLink class="help-nav-link help-nav-link--sub" :to="{ name: 'help-example', params: { exampleId: 'request-condition-transform' } }">
                  {{ t('pipelineEditor.help.example1Title') }}
                </RouterLink>
                <RouterLink class="help-nav-link help-nav-link--sub" :to="{ name: 'help-example', params: { exampleId: 'list-wildcard-transform' } }">
                  {{ t('pipelineEditor.help.example2Title') }}
                </RouterLink>
                <RouterLink class="help-nav-link help-nav-link--sub" :to="{ name: 'help-example', params: { exampleId: 'dummyjson-auth-profile' } }">
                  {{ t('pipelineEditor.help.example3Title') }}
                </RouterLink>

                <p class="help-nav-title">{{ t('pipelineEditor.help.section3Title') }}</p>
                <RouterLink class="help-nav-link help-nav-link--sub" :to="{ name: 'help-condition-array' }">
                  {{ t('pipelineEditor.help.section3Title') }}
                </RouterLink>
              </nav>
            </aside>

            <section class="help-doc-content">
              <HelpBreadcrumb />
              <RouterView />
            </section>
          </div>
        </template>
      </Card>
    </section>
  </main>
</template>

<style scoped>
.help-page {
  min-height: 100vh;
  padding: clamp(1rem, 2vw, 1.8rem);
  background:
    radial-gradient(circle at 15% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 35%),
    linear-gradient(180deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 94%, #fff) 100%);
}

.help-topbar {
  max-width: 1200px;
  margin: 0 auto 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.help-topbar-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.45rem;
}

.help-shell {
  max-width: 1200px;
  margin: 0 auto;
}

.help-card {
  border: 1px solid var(--border);
}

.help-title-row {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
}

.help-title-row i {
  font-size: 1.2rem;
  color: var(--accent);
}

.help-title-row h1 {
  margin: 0;
  font-size: clamp(1.15rem, 2vw, 1.4rem);
}

.help-content-wrapper {
  display: grid;
  grid-template-columns: minmax(230px, 260px) minmax(0, 1fr);
  gap: 1rem;
  padding-right: 0.1rem;
}

.help-sidebar {
  position: sticky;
  top: 0.5rem;
  align-self: start;
}

.help-nav {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--panel);
  padding: 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
}

.help-nav-title {
  margin: 0.55rem 0 0.1rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-soft);
  font-weight: 700;
}

.help-nav-link {
  text-decoration: none;
  color: var(--text-soft);
  padding: 0.3rem 0.45rem;
  border-radius: 6px;
  font-size: 0.84rem;
}

.help-nav-link:hover {
  color: var(--text);
  background: var(--surface-hover, rgba(0, 0, 0, 0.04));
}

.help-nav-link.router-link-active {
  color: var(--text);
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  font-weight: 600;
}

.help-nav-link--sub {
  font-size: 0.8rem;
  padding-left: 0.6rem;
}

.help-doc-content {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--panel);
  padding: 0.95rem;
}

@media (max-width: 700px) {
  .help-topbar {
    flex-direction: column;
    align-items: stretch;
  }

  .help-topbar-actions {
    justify-content: space-between;
  }

  .help-content-wrapper {
    grid-template-columns: 1fr;
  }

  .help-sidebar {
    position: static;
  }
}
</style>
