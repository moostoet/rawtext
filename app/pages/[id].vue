<!-- pages/[id].vue -->
<script setup lang="ts">
import Codemirror from 'vue-codemirror6'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { go as goLang } from '@codemirror/lang-go'
import { rust } from '@codemirror/lang-rust'
import { java as javaLang } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { json as jsonLang } from '@codemirror/lang-json'
import { yaml as yamlLang } from '@codemirror/lang-yaml'
import { useToast } from '#imports'
import { LazyPasswordPrompt } from '#components'

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

const route = useRoute()
const toast = useToast()
const id = route.params.id as string

const overlay = useOverlay()
const passwordModal = overlay.create(LazyPasswordPrompt)

type Paste = {
  id: string
  content: string
  language?: string | null
  createdAt?: string
  expiresAt?: string | null
  views?: number
}
const paste = ref<Paste | null>(null)
const pending = ref(true)
const error = ref<any>(null)

const showPasswordModal = ref(false)
const passwordInput = ref('')
const passwordLoading = ref(false)

const rawUrl = `/raw/${id}`

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: 'Copied!', description: `${label} copied to clipboard`, duration: 2000, color: 'primary' })
  } catch {
    toast.add({ title: 'Failed to copy', description: 'Please copy manually', duration: 3000, color: 'error' })
  }
}
async function copyUrl() { await copyToClipboard(window.location.href, 'URL') }
async function copyRawUrl() {
  const fullRawUrl = new URL(rawUrl, window.location.origin).href
  await copyToClipboard(fullRawUrl, 'Raw URL')
}
async function copyContent() { if (paste.value?.content) await copyToClipboard(paste.value.content, 'Content') }

useHead(() => ({
  title: `${id} — rawtext.dev`,
  meta: [{ name: 'description', content: (paste.value?.content || '').slice(0, 140) }]
}))


/** Map our language keys -> CodeMirror language extensions */
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

const LANG_NAMES: Record<string, string> = {
  js: 'JavaScript',
  ts: 'TypeScript',
  py: 'Python',
  go: 'Go',
  rs: 'Rust',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  json: 'JSON',
  yaml: 'YAML'
}

const detectedKey = computed<string | null>(() => {
  const lang = (paste.value?.language ?? 'auto') as string
  if (!paste.value?.content) return null
  if (lang && lang !== 'auto') return null
  const allowed = Object.keys(HL_TO_KEY)
  const { language } = hljs.highlightAuto(paste.value.content, allowed)
  return language ? (HL_TO_KEY[language] ?? null) : null
})
const effectiveKey = computed<string | null>(() => {
  const lang = (paste.value?.language ?? null) as string | null
  return lang && lang !== 'auto' ? lang : detectedKey.value
})
const cmExtensions = computed(() => {
  const ext = cmLangFor(effectiveKey.value)
  return ext ? [EditorView.editable.of(false), oneDark, ext] : [EditorView.editable.of(false), oneDark]
})
const displayLang = computed(() => {
  const key = effectiveKey.value
  return key ? (LANG_NAMES[key] ?? key) : 'Plain Text'
})

function formatRelativeTime(dateStr: string | undefined) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

async function loadPaste(password?: string) {
  pending.value = true
  error.value = null
  try {
    const res = await $fetch(`/api/pastes/${id}`, { query: password ? { password } : undefined })
    paste.value = res
  } catch (e: any) {
    if (e?.statusCode === 401) {
      // open modal and wait for result
      const instance = passwordModal.open()
      const result = await instance.result // resolves with emitted value
      if (typeof result === 'string' && result) {
        return await loadPaste(result) // retry with password
      }
      // user canceled: stay on page or redirect
    } else {
      error.value = e
    }
  } finally {
    pending.value = false
  }
}
onMounted(() => loadPaste())

async function submitPassword() {
  if (!passwordInput.value) return
  passwordLoading.value = true
  try {
    await loadPaste(passwordInput.value)
    passwordInput.value = ''
  } finally {
    passwordLoading.value = false
  }
}
</script>

<template>
  <div class="h-screen supports-[height:100dvh]:h-[100dvh] flex flex-col bg-white dark:bg-gray-950">
    <header class="flex-shrink-0 w-full bg-white/70 dark:bg-gray-950/60 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <div class="mx-auto max-w-screen-lg px-4 py-3 flex flex-wrap items-center gap-2 sm:gap-3 justify-between">
        <div class="flex items-center gap-2 text-sm">
          <NuxtLink to="/" class="text-lg font-semibold hover:text-primary-500 transition-colors">rawtext.dev</NuxtLink>
          <span class="text-gray-400">/</span>
          <span class="font-mono text-gray-600 dark:text-gray-400">{{ id }}</span>
          <UBadge v-if="displayLang" variant="subtle" size="md">{{ displayLang }}</UBadge>
          <span v-if="paste?.createdAt" class="text-xs text-gray-500 dark:text-gray-400 ml-2">{{ formatRelativeTime(paste.createdAt) }}</span>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UButton @click="copyContent" icon="i-lucide-copy" variant="ghost" size="sm" title="Copy content">Copy</UButton>
          <UButton @click="copyUrl" icon="i-lucide-link" variant="ghost" size="sm" title="Copy URL">URL</UButton>
          <UButton :to="rawUrl" target="_blank" icon="i-lucide-file-text" variant="ghost" size="sm" title="View raw">Raw</UButton>
          <UButton :to="`/?fork=${id}`" icon="i-lucide-git-fork" size="sm" title="Fork this paste">Fork</UButton>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="pending" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-gray-400 mb-2" />
        <p class="text-gray-500">Loading paste...</p>
      </div>
    </div>

    <!-- Error (non-401) -->
    <div v-else-if="error || !paste" class="flex-1 flex items-center justify-center">
      <div class="text-center p-8">
        <UIcon name="i-lucide-file-x" class="text-5xl text-gray-400 mb-4" />
        <h2 class="text-xl font-semibold mb-2">Paste not found</h2>
        <p class="text-gray-500 mb-4">This paste doesn't exist or has expired.</p>
        <UButton to="/" icon="i-lucide-home">Go to Home</UButton>
      </div>
    </div>

    <!-- Viewer -->
    <main v-else class="flex-1 min-h-0 overflow-hidden">
      <div class="h-full">
        <ClientOnly>
          <Codemirror
            :model-value="paste?.content || ''"
            :extensions="cmExtensions"
            :basic-setup="true"
            :autofocus="false"
            :indent-with-tab="true"
            :tab-size="2"
            :readonly="true"
            placeholder="(empty)"
            class="cm-wrapper h-full"
          />
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

/* Ensure read-only cursor is visible but not blinking */
.cm-wrapper .cm-editor.cm-focused .cm-cursor {
  display: none;
}
</style>