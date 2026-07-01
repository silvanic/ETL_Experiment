<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import type * as Monaco from 'monaco-editor'

type EditorSnippet = {
  label: string
  insertText: string
  detail?: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  language?: string
  suggestions?: string[]
  snippets?: EditorSnippet[]
  height?: number
  readOnly?: boolean
}>(), {
  language: 'plaintext',
  suggestions: () => [],
  snippets: () => [],
  height: 260,
  readOnly: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

let completionProviderDisposable: Monaco.IDisposable | null = null
const monacoRef = shallowRef<typeof Monaco | null>(null)
const isDarkTheme = ref(false)
let classObserver: MutationObserver | null = null

function detectDarkMode(): boolean {
  const hasDarkClass =
    document.documentElement.classList.contains('app-dark')
    || document.body.classList.contains('app-dark')
    || document.getElementById('app')?.classList.contains('app-dark')

  if (hasDarkClass) {
    return true
  }

  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

function refreshDarkMode(): void {
  isDarkTheme.value = detectDarkMode()
}

function setupDarkModeObserver(): void {
  refreshDarkMode()

  const targets: Node[] = [document.documentElement, document.body]
  const appRoot = document.getElementById('app')
  if (appRoot) {
    targets.push(appRoot)
  }

  classObserver = new MutationObserver(() => {
    refreshDarkMode()
  })

  targets.forEach((target) => {
    classObserver?.observe(target, { attributes: true, attributeFilter: ['class'] })
  })

  globalThis.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', refreshDarkMode)
}

function tearDownDarkModeObserver(): void {
  classObserver?.disconnect()
  classObserver = null
  globalThis.matchMedia?.('(prefers-color-scheme: dark)').removeEventListener('change', refreshDarkMode)
}

function disposeCompletionProvider(): void {
  completionProviderDisposable?.dispose()
  completionProviderDisposable = null
}

function registerCompletionProvider(): void {
  disposeCompletionProvider()

  if (!monacoRef.value) {
    return
  }

  completionProviderDisposable = monacoRef.value.languages.registerCompletionItemProvider(props.language, {
    triggerCharacters: ['#', '{'],
    provideCompletionItems(model: Monaco.editor.ITextModel, position: Monaco.Position) {
      if (!props.suggestions.length && !props.snippets.length) {
        return { suggestions: [] }
      }

      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const variableSuggestions = Array.from(new Set(props.suggestions))
        .filter((entry) => entry.trim().length > 0)
        .map((entry) => ({
          label: entry,
          kind: monacoRef.value!.languages.CompletionItemKind.Variable,
          insertText: entry,
          range,
        }))

      const snippetSuggestions = props.snippets
        .filter((snippet) => snippet.label.trim().length > 0 && snippet.insertText.trim().length > 0)
        .map((snippet) => ({
          label: snippet.label,
          detail: snippet.detail,
          kind: monacoRef.value!.languages.CompletionItemKind.Snippet,
          insertText: snippet.insertText,
          insertTextRules: monacoRef.value!.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        }))

      return { suggestions: [...snippetSuggestions, ...variableSuggestions] }
    },
  })
}

const editorOptions = computed<Monaco.editor.IStandaloneEditorConstructionOptions>(() => ({
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  lineNumbers: 'on',
  wordWrap: 'on',
  tabSize: 2,
  readOnly: props.readOnly,
  fontSize: 13,
  formatOnPaste: props.language === 'json',
  formatOnType: props.language === 'json',
  renderValidationDecorations: 'on',
}))

const editorTheme = computed(() => (isDarkTheme.value ? 'vs-dark' : 'vs'))

watch(
  () => props.language,
  () => {
    registerCompletionProvider()
  },
  { immediate: true },
)

watch(
  () => props.suggestions,
  () => {
    registerCompletionProvider()
  },
  { deep: true },
)

watch(
  () => props.snippets,
  () => {
    registerCompletionProvider()
  },
  { deep: true },
)

function handleEditorMount(_editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco): void {
  monacoRef.value = monaco
  registerCompletionProvider()
}

onBeforeUnmount(() => {
  tearDownDarkModeObserver()
  disposeCompletionProvider()
})

onMounted(() => {
  setupDarkModeObserver()
})

function handleValueUpdate(value: string | undefined): void {
  emit('update:modelValue', value ?? '')
}
</script>

<template>
  <VueMonacoEditor
    class="code-editor-field"
    :value="modelValue"
    :language="language"
    :theme="editorTheme"
    :options="editorOptions"
    :style="{ height: `${height}px` }"
    @mount="handleEditorMount"
    @update:value="handleValueUpdate"
  />
</template>

<style scoped>
.code-editor-field {
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
}
</style>