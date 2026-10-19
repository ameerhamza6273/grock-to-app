<script setup lang="ts">
defineProps<{ label: string }>()
const emit = defineEmits<{ add: [files: File[]] }>()

const input = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const error = ref('')

function pick(list: FileList | null | undefined) {
  const files = Array.from(list ?? [])
  const images = files.filter(f => f.type.startsWith('image/'))
  error.value = images.length < files.length ? 'Some files were skipped — only JPG, PNG or WebP images work.' : ''
  if (images.length) emit('add', images)
  if (input.value) input.value.value = ''
}

function onDrop(e: DragEvent) {
  dragging.value = false
  pick(e.dataTransfer?.files)
}
</script>

<template>
  <div>
    <div
      class="drop compact"
      :class="{ dragging }"
      role="button"
      tabindex="0"
      @click="input?.click()"
      @keydown.enter.space.prevent="input?.click()"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <p class="drop-label">{{ label }}</p>
      <input
        ref="input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        @change="pick(($event.target as HTMLInputElement).files)"
      >
    </div>
    <p v-if="error" class="field-error">{{ error }}</p>
  </div>
</template>
