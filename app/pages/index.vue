<!-- pages/index.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { keymap } from '@codemirror/view'
import { useRoute, navigateTo } from '#app'
import { useToast } from '#imports'

// CodeMirror (Vue 3)
import Codemirror from 'vue-codemirror6'
import { oneDark } from '@codemirror/theme-one-dark'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { go as goLang } from '@codemirror/lang-go'
import { rust } from '@codemirror/lang-rust'
import { java as javaLang } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { json as jsonLang } from '@codemirror/lang-json'
import { yaml as yamlLang } from '@codemirror/lang-yaml'

// Auto-detection (for "Auto" mode)
import hljs from 'highlight.js/lib/core'
import hljsJavascript from 'highlight.js/lib/languages/javascript'
import hljsTypescript from 'highlight.js/lib/languages/typescript'
import hljsPython from 'highlight.js/lib/languages/python'
import hljsGo from 'highlight.js/lib/languages/go'
import hljsRust from 'highlight.js/lib/languages/rust'
import hljsJava from 'highlight.js/lib/languages/java'
import hljsCpp from 'highlight.js/lib/languages/cpp'
import hljsC from 'highlight.js/lib/languages/c'
import hljsJson from 'highlight.js/lib/languages/json'
import hljsYaml from 'highlight.js/lib/languages/yaml'

// Register only what we need (lightweight)
hljs.registerLanguage('javascript', hljsJavascript)
hljs.registerLanguage('typescript', hljsTypescript)
hljs.registerLanguage('python', hljsPython)
hljs.registerLanguage('go', hljsGo)
hljs.registerLanguage('rust', hljsRust)
hljs.registerLanguage('java', hljsJava)
hljs.registerLanguage('cpp', hljsCpp)
hljs.registerLanguage('c', hljsC)
hljs.registerLanguage('json', hljsJson)
hljs.registerLanguage('yaml', hljsYaml)
hljs.registerLanguage('yml', hljsYaml)

const content = ref('')
const language = ref<string | null>('auto')
const visibility = ref<'public' | 'unlisted'>('unlisted')
const expiresIn = ref<number | null>(60 * 60 * 24 * 7) // 1 week
const password = ref('')
const burnAfterRead = ref(false)
const saving = ref(false)
const toast = useToast()
const route = useRoute()

const isPublic = computed<boolean>({
  get: () => visibility.value === 'public',
  set: (v) => { visibility.value = v ? 'public' : 'unlisted' }
})

const languageItems = [
  { label: 'Auto', value: 'auto' },
  { label: 'JavaScript', value: 'js' },
  { label: 'TypeScript', value: 'ts' },
  { label: 'Python', value: 'py' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rs' },
  { label: 'Java', value: 'java' },
  { label: 'C', value: 'c' },
  { label: 'C++', value: 'cpp' },
  { label: 'JSON', value: 'json' },
  { label: 'YAML', value: 'yaml' }
]

const expiryItems = [
  { label: '1 hour', value: 3600 },
  { label: '1 day', value: 86400 },
  { label: '1 week', value: 604800 },
  { label: 'Never', value: null }
]

onMounted(async () => {
  const fork = route.query.fork as string | undefined
  if (fork) {
    try {
      const r = await $fetch(`/api/pastes/${fork}`)
      content.value = (r as any)?.content ?? ''
    } catch { }
  }
})

async function save() {
  saving.value = true

  try {
    const { url } = await $fetch('/api/pastes', {
      method: 'POST',
      body: {
        content: content.value,
        language: language.value ?? undefined,
        visibility: visibility.value,
        expiresIn: expiresIn.value ?? undefined,
        password: password.value || undefined,
        burnAfterRead: burnAfterRead.value
      }
    })
    await navigateTo(url, { external: true })
  } catch (e: any) {
    toast.add({ title: 'Save failed', description: e?.statusMessage || 'Error' })
  } finally {
    saving.value = false
  }
}

function cmLangFor(key: string | null | undefined) {
  switch (key) {
    case 'js': return javascript()
    case 'ts': return javascript({ typescript: true })
    case 'py': return python()
    case 'go': return goLang()
    case 'rs': return rust()
    case 'java': return javaLang()
    case 'c':
    case 'cpp': return cpp()
    case 'json': return jsonLang()
    case 'yaml': return yamlLang()
    default: return null
  }
}

const HL_TO_KEY: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  go: 'go',
  rust: 'rs',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml'
}

function detectKeyFromContent(code: string): string | null {
  if (!code || !code.trim()) return null
  const allowed = Object.keys(HL_TO_KEY)
  const { language: hl } = hljs.highlightAuto(code, allowed)
  return hl ? HL_TO_KEY[hl] ?? null : null
}

const effectiveKey = ref<string | null>(null)
watch([content, language], ([code, lang]) => {
  effectiveKey.value = (lang === 'auto') ? (detectKeyFromContent(code) ?? null) : lang
}, { immediate: true })

const saveKeymap = keymap.of([{
  key: 'Mod-s',
  run: () => { if (!saving.value) save(); return true }
}])

const cmExtensions = computed(() => {
  const ext = cmLangFor(effectiveKey.value)
  return ext ? [saveKeymap, ext, oneDark] : [saveKeymap, oneDark]
})

const onGlobalSave = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    if (!saving.value) save()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalSave)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalSave)
})

useHead(() => ({
  title: `rawtext.dev`,
}))

</script>

<template>
  <div class="h-screen supports-[height:100dvh]:h-[100dvh] flex flex-col bg-white dark:bg-gray-950">
    <header
      class="flex-shrink-0 w-full bg-white/70 dark:bg-gray-950/60 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <div class="mx-auto max-w-screen-lg px-4 py-3 flex flex-wrap items-center gap-2 sm:gap-3 justify-between">
        <h1 class="text-xl sm:text-2xl font-semibold tracking-tight">rawtext.dev</h1>

        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
          <!-- Language -->
          <USelectMenu v-model="language" :items="languageItems" value-key="value" placeholder="Language" size="sm"
            class="w-36" :search-input="{ placeholder: 'Search…' }" />
          <!-- Expiry -->
          <USelectMenu v-model="expiresIn" :items="expiryItems" value-key="value" placeholder="Expires" size="sm"
            class="w-36" />
          <USwitch v-model="burnAfterRead" label="Burn" size="sm" class="px-1" />
          <USwitch v-model="isPublic" label="Public" size="sm" class="px-1" />
          <UInput v-model="password" type="password" placeholder="Password (optional)" size="sm" class="w-44 sm:w-56" />
          <UButton :loading="saving" @click="save" icon="i-lucide-save" size="sm">Save</UButton>
        </div>
      </div>
    </header>

    <!-- Editor fills remaining viewport -->
    <main class="flex-1 min-h-0 overflow-hidden">
      <div class="h-full">
        <ClientOnly>
          <Codemirror v-model="content" :extensions="cmExtensions" :autofocus="true" :indent-with-tab="true"
            :basic="true" :tab-size="2" placeholder="Paste your code here…" class="cm-wrapper h-full" />
          <template #fallback>
            <div class="h-full flex items-center justify-center">
              <UIcon name="i-lucide-loader-2" class="animate-spin text-2xl text-gray-400" />
            </div>
          </template>
        </ClientOnly>
      </div>
    </main>
  </div>
</template>

<style>
/* Make the CodeMirror editor truly fill the available space */
.cm-wrapper,
.cm-wrapper .cm-editor {
  height: 100%;
}

.cm-wrapper .cm-scroller {
  height: 100%;
  overflow: auto;
}
</style>
