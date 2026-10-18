<script setup lang="ts">
import type {
  GenerateResponse,
  PadSearchResponse,
  PadSearchResult,
  SavedTemplate,
  UploadTemplateResponse
} from '~/types/api'

// ---- Step 1: template ----
const storeName = ref('')
const templateSource = ref<'upload' | 'saved'>('upload')
const templateFile = ref<File | null>(null)
const saveAsMaster = ref(false)
const templateName = ref('')

const { data: savedTemplates, refresh: refreshTemplates } = await useFetch<SavedTemplate[]>('/api/templates', {
  default: () => []
})
const selectedTemplateId = ref<number | null>(null)
const selectedTemplate = computed(() => savedTemplates.value.find(t => t.id === selectedTemplateId.value) ?? null)

watch(selectedTemplate, (t) => {
  // Saved templates remember their store; prefill it only if the user hasn't typed one
  if (t?.store_name && !storeName.value.trim()) storeName.value = t.store_name
})

// The uploaded template is reused across "Generate" clicks until the file changes
let uploaded: { file: File, path: string } | null = null
watch(templateFile, () => { uploaded = null })

async function archiveSelected() {
  const t = selectedTemplate.value
  if (!t || !confirm(`Remove "${t.name}" from saved templates?`)) return
  try {
    await $fetch(`/api/templates/${t.id}`, { method: 'DELETE' })
    selectedTemplateId.value = null
    await refreshTemplates()
  } catch (e) {
    error.value = errorMessage(e)
  }
}

// ---- Step 2: rotor + pads ----
const rotorPart = ref('')
const rotorFile = ref<File | null>(null)

const padPart = ref('')
const padFile = ref<File | null>(null)
const padSearching = ref(false)
const padSearch = ref<PadSearchResponse | null>(null)
const confirmedPad = ref<PadSearchResult | null>(null)

async function searchPads() {
  if (!padPart.value.trim()) return
  padSearching.value = true
  confirmedPad.value = null
  try {
    const fd = new FormData()
    fd.append('part_number', padPart.value.trim())
    padSearch.value = await $fetch<PadSearchResponse>('/api/search-pads', { method: 'POST', body: fd })
  } catch (e) {
    padSearch.value = { part_number: padPart.value, results: [], message: errorMessage(e) }
  } finally {
    padSearching.value = false
  }
}

// An uploaded pad photo always wins over a search pick (same rule as the backend)
watch(padFile, (f) => { if (f) confirmedPad.value = null })
watch(padPart, () => { padSearch.value = null; confirmedPad.value = null })

// ---- Step 3: generate ----
const generating = ref(false)
const status = ref('')
const error = ref('')
const result = ref<GenerateResponse | null>(null)

// Mirrors make_final_filename() in backend/app/services.py
const expectedFilename = computed(() => {
  const store = storeName.value.replace(/[^A-Za-z0-9_-]/g, '') || 'Store'
  const rotor = rotorPart.value.replace(/[^A-Za-z0-9]/g, '') || 'ROTOR'
  const pad = padPart.value.replace(/[^A-Za-z0-9]/g, '') || 'PAD'
  return `${store}_${rotor}_${pad}_Final.jpg`
})

const missing = computed(() => {
  const list: string[] = []
  if (!storeName.value.trim()) list.push('store name')
  if (templateSource.value === 'upload' ? !templateFile.value : !selectedTemplate.value) list.push('template')
  if (!rotorFile.value && !padFile.value && !confirmedPad.value?.local_path) list.push('a rotor or pad image')
  return list
})

function errorMessage(e: unknown): string {
  const err = e as { data?: { detail?: unknown }, statusCode?: number, message?: string }
  const detail = err.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((d: { msg?: string }) => d.msg).join(', ')
  if (err.statusCode === 413) return 'File is too large.'
  return err.message || 'Something went wrong.'
}

async function resolveTemplatePath(): Promise<string> {
  if (templateSource.value === 'saved') return selectedTemplate.value!.path

  const file = templateFile.value!
  if (uploaded?.file === file) return uploaded.path

  status.value = 'Uploading template…'
  const fd = new FormData()
  fd.append('template', file)
  fd.append('store_name', storeName.value.trim())
  fd.append('template_name', templateName.value.trim())
  fd.append('save_as_master', String(saveAsMaster.value))
  const res = await $fetch<UploadTemplateResponse>('/api/upload-template', { method: 'POST', body: fd })
  uploaded = { file, path: res.path }

  if (res.template) {
    // Saved as master: switch to it so later runs don't upload it again
    await refreshTemplates()
    templateSource.value = 'saved'
    selectedTemplateId.value = res.template.id
    templateFile.value = null
  }
  return res.path
}

async function generate() {
  if (missing.value.length || generating.value) return
  generating.value = true
  error.value = ''
  result.value = null
  try {
    const templatePath = await resolveTemplatePath()

    status.value = 'Generating final image… this can take a minute.'
    const fd = new FormData()
    fd.append('store_name', storeName.value.trim())
    fd.append('template_path', templatePath)
    fd.append('is_one_time', String(templateSource.value === 'upload' && !saveAsMaster.value))
    fd.append('rotor_part', rotorPart.value.trim())
    fd.append('pad_part', padPart.value.trim())
    if (rotorFile.value) fd.append('rotor_image', rotorFile.value)
    if (padFile.value) fd.append('pad_image', padFile.value)
    else if (confirmedPad.value?.local_path) fd.append('confirmed_pad_path', confirmedPad.value.local_path)

    result.value = await $fetch<GenerateResponse>('/api/generate', { method: 'POST', body: fd })
    status.value = ''
  } catch (e) {
    status.value = ''
    error.value = errorMessage(e)
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="topbar">
      <div class="container topbar-inner">
        <h1>Product Template Generator</h1>
        <span class="muted small">Beta</span>
      </div>
    </header>

    <main class="container stack">
      <!-- STEP 1 -->
      <section class="card">
        <h2><span class="step">1</span> Base template</h2>
        <p class="muted">Branding, logos, hardware, text and layout stay exactly as in the template — only the rotors and pads are swapped.</p>

        <label class="field">
          <span>Customer / store name *</span>
          <input v-model="storeName" type="text" placeholder="e.g. AleAutoParts">
        </label>

        <div class="tabs" role="tablist">
          <button type="button" role="tab" :aria-selected="templateSource === 'upload'" :class="{ active: templateSource === 'upload' }" @click="templateSource = 'upload'">
            Upload new
          </button>
          <button type="button" role="tab" :aria-selected="templateSource === 'saved'" :class="{ active: templateSource === 'saved' }" @click="templateSource = 'saved'">
            Saved templates ({{ savedTemplates.length }})
          </button>
        </div>

        <div v-if="templateSource === 'upload'" class="stack-sm">
          <ImageDrop v-model="templateFile" label="Drag & drop the template image here, or click to browse" />
          <div class="radios">
            <label><input v-model="saveAsMaster" type="radio" :value="false"> One-time use</label>
            <label><input v-model="saveAsMaster" type="radio" :value="true"> Save as reusable master template</label>
          </div>
          <label v-if="saveAsMaster" class="field">
            <span>Template name</span>
            <input v-model="templateName" type="text" placeholder="e.g. Brembo + ALE front kit">
          </label>
        </div>

        <div v-else class="stack-sm">
          <p v-if="!savedTemplates.length" class="muted">No saved templates yet. Upload one and choose “Save as reusable master template”.</p>
          <div v-else class="tpl-grid">
            <button
              v-for="t in savedTemplates"
              :key="t.id"
              type="button"
              class="tpl"
              :class="{ selected: t.id === selectedTemplateId }"
              @click="selectedTemplateId = t.id"
            >
              <img :src="t.url" :alt="t.name">
              <span>{{ t.name }}</span>
            </button>
          </div>
          <div v-if="selectedTemplate" class="row-between">
            <span class="small muted">Selected: {{ selectedTemplate.name }}</span>
            <button type="button" class="btn-text danger" @click="archiveSelected">Remove from saved</button>
          </div>
        </div>
      </section>

      <!-- STEP 2 -->
      <section class="card">
        <h2><span class="step">2</span> Rotor &amp; brake pads</h2>
        <p class="muted">Provide a new rotor and/or pad image. Part numbers go into the output filename.</p>

        <div class="grid-2">
          <div class="stack-sm">
            <h3>Rotor</h3>
            <label class="field">
              <span>Rotor part number</span>
              <input v-model="rotorPart" type="text" placeholder="e.g. DF_63326007R">
            </label>
            <ImageDrop v-model="rotorFile" label="Upload rotor image" compact />
          </div>

          <div class="stack-sm">
            <h3>Brake pads</h3>
            <label class="field">
              <span>Pad part number</span>
              <div class="input-row">
                <input v-model="padPart" type="text" placeholder="e.g. P09028" @keydown.enter.prevent="searchPads">
                <button type="button" class="btn-secondary" :disabled="!padPart.trim() || padSearching" @click="searchPads">
                  {{ padSearching ? 'Searching…' : 'Find pads' }}
                </button>
              </div>
            </label>

            <div v-if="padSearch" class="pad-results">
              <template v-if="padSearch.results.length">
                <p class="small">Confirm the correct pad photo:</p>
                <div class="tpl-grid">
                  <button
                    v-for="r in padSearch.results"
                    :key="r.id"
                    type="button"
                    class="tpl"
                    :class="{ selected: confirmedPad?.id === r.id }"
                    :disabled="!!padFile"
                    @click="confirmedPad = confirmedPad?.id === r.id ? null : r"
                  >
                    <img :src="r.thumbnail || r.url" :alt="r.title">
                    <span>{{ r.title }}</span>
                  </button>
                </div>
              </template>
              <p v-else class="small muted">{{ padSearch.message }}</p>
            </div>

            <ImageDrop v-model="padFile" label="Or upload your own pad image" compact />
          </div>
        </div>
      </section>

      <!-- STEP 3 -->
      <section class="card">
        <h2><span class="step">3</span> Generate final product</h2>
        <p class="small muted">Output file: <code>{{ expectedFilename }}</code></p>

        <button type="button" class="btn-primary" :disabled="!!missing.length || generating" @click="generate">
          {{ generating ? 'Working…' : 'Generate final image' }}
        </button>
        <p v-if="missing.length && !generating" class="small muted center">Still needed: {{ missing.join(', ') }}</p>
        <p v-if="status" class="small center">{{ status }}</p>
        <p v-if="error" class="alert">{{ error }}</p>

        <div v-if="result" class="result">
          <img :src="`${result.final_url}?t=${result.job_id}`" :alt="result.filename">
          <a class="btn-success" :href="result.download_url" :download="result.filename">Download {{ result.filename }}</a>
        </div>
      </section>
    </main>
  </div>
</template>
