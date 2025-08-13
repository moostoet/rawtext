<!-- pages/raw/[id].vue -->
<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const id = route.params.id as string

// Fetch plain text from the raw API
const { data, pending, error } = await useFetch<string>(`/api/raw/${id}`, {
  responseType: 'text'
})

useHead({ title: `${id} — raw` })
</script>

<template>
  <div v-if="pending" class="p-4 text-gray-500">Loading…</div>
  <div v-else-if="error" class="p-4 text-red-500">Not found or expired.</div>

  <!-- Plain text, no UI chrome -->
  <pre v-else class="p-4 whitespace-pre-wrap break-words font-mono text-sm">
{{ data }}
  </pre>
</template>
