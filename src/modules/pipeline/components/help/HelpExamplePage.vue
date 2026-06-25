<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePipelineEditorStore } from '@/modules/pipeline/stores/pipelineEditorStore'
import { pipelineTemplates } from '@/modules/pipeline/data/templates'
import HelpFaqSection from '@/modules/pipeline/components/help/HelpFaqSection.vue'
import {
  buildExampleOneSteps,
  buildExampleThreeSteps,
  buildExampleTwoSteps,
  resolveHelpExampleSlug,
  resolveTemplateIdFromExampleSlug,
  type HelpExampleSlug,
  type HelpStep,
} from '@/modules/pipeline/components/help/helpDocData'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = usePipelineEditorStore()

const exampleId = computed<HelpExampleSlug>(() => {
  const raw = String(route.params.exampleId ?? '')
  const resolved = resolveHelpExampleSlug(raw)
  if (resolved) {
    return resolved
  }

  return 'request-condition-transform'
})

const rawExampleParam = computed(() => String(route.params.exampleId ?? ''))
const shouldRedirectToCanonical = computed(() => {
  const resolved = resolveHelpExampleSlug(rawExampleParam.value)
  return !!resolved && resolved !== rawExampleParam.value
})

if (shouldRedirectToCanonical.value) {
  router.replace({ name: 'help-example', params: { exampleId: exampleId.value } })
}

if (!resolveHelpExampleSlug(rawExampleParam.value)) {
  router.replace({ name: 'help-overview' })
}

const exampleObjective = computed(() => {
  if (exampleId.value === 'request-condition-transform') {
    return t('pipelineEditor.help.exampleIntro')
  }

  if (exampleId.value === 'dummyjson-auth-profile') {
    return t('pipelineEditor.help.example3Intro')
  }

  return t('pipelineEditor.help.example2Intro')
})

const expectedOutcome = computed(() => {
  if (exampleId.value === 'request-condition-transform') {
    return 'Resultat attendu: la variable de sortie contient un titre dans $.result selon la branche vrai/faux.'
  }

  if (exampleId.value === 'dummyjson-auth-profile') {
    return 'Resultat attendu: le profil DummyJSON est récupéré en authentifié dans profile, avec profile.source pour tracer l origine.'
  }

  return 'Resultat attendu: tous les objets de $.users contiennent active=true apres transformation.'
})

const vigilancePoints = computed(() => {
  if (exampleId.value === 'request-condition-transform') {
    return [
      'Verifier que le chemin $.todo.completed existe bien dans la reponse API.',
      'Le type de comparaison doit rester booleen pour eviter une branche inattendue.',
      'Conserver des chemins de sortie explicites pour faciliter le debug dans la console.',
    ]
  }

  if (exampleId.value === 'dummyjson-auth-profile') {
    return [
      'Verifier que la requete de login retourne bien auth.accessToken dans la reponse.',
      'Conserver la syntaxe #authToken dans le header Authorization pour la substitution API.',
      'L endpoint /auth/me retourne le profil de l utilisateur authentifie: aucun parametre d ID requis.',
    ]
  }

  return [
    'Le wildcard [*] doit cibler un tableau reel (ex: $.users[*].active).',
    'Verifier que le outputPath de la requete API pointe bien vers la liste attendue.',
    'Tester sur un petit echantillon avant d appliquer la transformation en production.',
  ]
})

const steps = computed<HelpStep[]>(() => {
  if (exampleId.value === 'request-condition-transform') {
    return buildExampleOneSteps(t)
  }

  if (exampleId.value === 'dummyjson-auth-profile') {
    return buildExampleThreeSteps(t)
  }

  return buildExampleTwoSteps(t)
})

const faqItems = computed(() => {
  if (exampleId.value === 'request-condition-transform') {
    return [
      {
        question: 'Pourquoi cette condition part parfois sur faux ?',
        answer: 'La branche depend directement de $.todo.completed et du type compare. Verifiez la reponse source.',
      },
      {
        question: 'Puis-je reutiliser cet exemple en prod ?',
        answer: 'Oui, en remplacant l URL de test, puis en ajustant les chemins de sortie selon votre schema.',
      },
    ]
  }

  if (exampleId.value === 'dummyjson-auth-profile') {
    return [
      {
        question: 'Pourquoi utiliser #authToken au lieu de {{authToken}} ?',
        answer: 'Le moteur de substitution de l application utilise la syntaxe #variable dans les config API.',
      },
      {
        question: 'Pourquoi /auth/me et pas /users/123 ?',
        answer: 'L endpoint /auth/me utilise le token Bearer pour identifier l utilisateur: plus simple et plus securise.',
      },
    ]
  }

  return [
    {
      question: 'Le wildcard [*] modifie-t-il tous les elements ?',
      answer: 'Oui, si le chemin cible un tableau valide. Sinon la transformation ne s applique pas.',
    },
    {
      question: 'Comment limiter le risque ?',
      answer: 'Testez d abord sur un jeu reduit puis comparez avant/apres dans la console d execution.',
    },
  ]
})

/**
 * Load the example as a template in the editor in a new tab
 */
function loadTemplateInEditor(): void {
  const templateId = resolveTemplateIdFromExampleSlug(exampleId.value)
  if (!templateId) {
    return
  }

  const template = pipelineTemplates.find((t) => t.id === templateId)
  if (!template) {
    return
  }

  store.loadFromTemplate(template.create())
  window.open(router.resolve({ name: 'editor' }).href, '_blank')
}
</script>

<template>
  <section class="help-doc-page">
    <div class="help-example-header">
      <h2 class="help-doc-title">
        {{
          exampleId === 'request-condition-transform'
            ? t('pipelineEditor.help.example1Title')
            : (exampleId === 'list-wildcard-transform'
              ? t('pipelineEditor.help.example2Title')
              : t('pipelineEditor.help.example3Title'))
        }}
      </h2>
      <button 
        class="help-example-load-btn"
        @click="loadTemplateInEditor"
        :title="`Charger cet exemple comme modèle dans l'éditeur`"
      >
        → Essayer dans l'éditeur
      </button>
    </div>

    <section class="help-doc-panel">
      <h3>Objectif</h3>
      <p class="help-doc-text">{{ exampleObjective }}</p>
      <p class="help-doc-text help-doc-text--strong">{{ expectedOutcome }}</p>
    </section>

    <section class="help-doc-panel">
      <h3>Points de vigilance</h3>
      <ul class="help-doc-list">
        <li v-for="item in vigilancePoints" :key="item">{{ item }}</li>
      </ul>
    </section>

    <ol class="help-doc-steps">
      <li v-for="step in steps" :key="`${step.type}-${step.title}`" class="help-doc-step">
        <h3>{{ step.title }}</h3>

        <p v-if="step.noConfig" class="help-doc-muted">{{ t('pipelineEditor.help.exampleSteps.noConfig') }}</p>

        <table v-else-if="step.fields?.length" class="help-doc-table">
          <tbody>
            <tr v-for="field in step.fields" :key="field.label">
              <th>{{ field.label }}</th>
              <td><code class="help-doc-inline-code">{{ field.value }}</code></td>
            </tr>
          </tbody>
        </table>

        <div v-if="step.branches" class="help-doc-branches">
          <article v-for="(branch, branchKey) in step.branches" :key="branchKey" class="help-doc-branch">
            <h4>{{ branch.label }}</h4>
            <table class="help-doc-table">
              <tbody>
                <tr v-for="field in branch.fields" :key="field.label">
                  <th>{{ field.label }}</th>
                  <td><code class="help-doc-inline-code">{{ field.value }}</code></td>
                </tr>
              </tbody>
            </table>
          </article>
        </div>
      </li>
    </ol>

    <HelpFaqSection :items="faqItems" />
  </section>
</template>

<style scoped>
.help-example-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.help-example-load-btn {
  padding: 0.5rem 1rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.help-example-load-btn:hover {
  background: var(--primary-light);
  transform: translateX(2px);
}

.help-example-load-btn:active {
  transform: translateX(0);
}

.help-doc-title {
  margin: 0 0 0.8rem;
  font-size: 1.1rem;
}

.help-doc-text {
  margin: 0 0 0.8rem;
  color: var(--text-soft);
  line-height: 1.55;
}

.help-doc-text--strong {
  margin-bottom: 0;
  color: var(--text);
}

.help-doc-panel {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.75rem;
  background: var(--panel);
}

.help-doc-panel h3 {
  margin: 0 0 0.45rem;
  font-size: 0.92rem;
}

.help-doc-list {
  margin: 0;
  padding-left: 1.15rem;
  color: var(--text-soft);
}

.help-doc-list li + li {
  margin-top: 0.35rem;
}

.help-doc-steps {
  margin: 0;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.help-doc-step h3 {
  margin: 0 0 0.45rem;
  font-size: 0.95rem;
}

.help-doc-muted {
  margin: 0.3rem 0 0;
  color: var(--text-soft);
  font-style: italic;
}

.help-doc-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.help-doc-table tr + tr {
  border-top: 1px solid var(--border);
}

.help-doc-table th {
  width: 34%;
  text-align: left;
  vertical-align: top;
  padding: 0.42rem 0.58rem;
  color: var(--text-soft);
  background: var(--surface-hover, rgba(0, 0, 0, 0.03));
}

.help-doc-table td {
  vertical-align: top;
  padding: 0.42rem 0.58rem;
}

.help-doc-inline-code {
  background: var(--surface-hover, rgba(0, 0, 0, 0.04));
  border-radius: 4px;
  padding: 0.1rem 0.34rem;
}

.help-doc-branches {
  margin-top: 0.7rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.help-doc-branch {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.45rem;
}

.help-doc-branch h4 {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
}

@media (max-width: 760px) {
  .help-doc-branches {
    grid-template-columns: 1fr;
  }
}
</style>
