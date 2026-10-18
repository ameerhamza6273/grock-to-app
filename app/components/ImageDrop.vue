<script setup lang="ts">
const props = defineProps<{
  label: string
  // Shown when no file is picked, e.g. a saved template's image
  previewUrl?: string | null
  compact?: boolean
}>()

const file = defineModel<File | null>({ default: null })

const input = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const objectUrl = ref<string | null>(null)
const error = ref('')

watch(file, (f) => {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = f ? URL.createObjectURL(f) : null
  if (!f && input.value) input.value.value = ''
})
onBeforeUnmount(() => {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
})

const shownUrl = computed(() => objectUrl.value || props.previewUrl || null)

function pick(files: FileList | null | undefined) {
  const f = files?.[0]
  if (!f) return
  if (!f.type.startsWith('image/')) {
    error.value = 'Please choose an image file (JPG, PNG or WebP).'
    return
  }
  error.value = ''
  file.value = f
}

function onDrop(e: DragEvent) {
  dragging.value = false
  pick(e.dataTransfer?.files)
}
</script>

<template>
  <div>
    <div
      class="drop"
      :class="{ dragging, compact, filled: !!shownUrl }"
      role="button"
      tabindex="0"
      @click="input?.click()"
      @keydown.enter.space.prevent="input?.click()"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <img v-if="shownUrl" :src="shownUrl" alt="" class="drop-preview">
      <p class="drop-label">
        <template v-if="file">{{ file.name }} · <span class="link">change</span></template>
        <template v-else-if="shownUrl"><span class="link">Replace image</span></template>
        <template v-else>{{ label }}</template>
      </p>
      <input
        ref="input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        @change="pick(($event.target as HTMLInputElement).files)"
      >
    </div>
    <div v-if="file" class="drop-actions">
      <button type="button" class="btn-text" @click="file = null">Remove</button>
    </div>
    <p v-if="error" class="field-error">{{ error }}</p>
  </div>
</template>
