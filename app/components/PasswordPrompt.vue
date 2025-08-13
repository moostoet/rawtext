<!-- components/PasswordPrompt.vue -->
<script setup lang="ts">
const emit = defineEmits<{ close: [false | string] }>()
const password = ref('')

function submit() {
  emit('close', password.value || false)
}
</script>

<template>
  <UModal
    title="Password required"
    :dismissible="false"
    :close="{ onClick: () => emit('close', false) }"
  >
    <template #body>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
        This paste is protected. Enter the password to view it.
      </p>
      <UInput
        v-model="password"
        type="password"
        placeholder="Password"
        autofocus
        @keydown.enter.prevent="submit"
      />
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" @click="emit('close', false)">Cancel</UButton>
        <UButton icon="i-lucide-unlock" @click="submit">Unlock</UButton>
      </div>
    </template>
  </UModal>
</template>
