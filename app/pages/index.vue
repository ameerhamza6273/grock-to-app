<script setup lang="ts">
import { zipSync } from 'fflate'
import { composeListing, finalFilename, forgetTemplate, parsePhotoName, type PhotoKind } from '~/utils/compose'
import { customTemplate, templates, type TemplateLayout } from '~/utils/templates'

// ---- Step 1: template ----
// The user's own blank template, e.g. for another brand
const ownBase = ref<{ file: File, url: string } | null>(null)
const own = shallowRef<TemplateLayout | null>(null)
let ownVersion = 0

function setOwn(files: File[] | null) {
  if (ownBase.value) URL.revokeObjectURL(ownBase.value.url)
  ownBase.value = files?.[0] ? { file: files[0], url: URL.createObjectURL(files[0]) } : null
  if (own.value) forgetTemplate(own.value.id)
  own.value = ownBase.value ? customTemplate(`own-${++ownVersion}`, ownBase.value.url) : null
  if (own.value) templateId.value = own.value.id
  else if (!templates.some(t => t.id === templateId.value)) templateId.value = templates[0]!.id
}

const allTemplates = computed(() => (own.value ? [...templates, own.value] : templates))
const templateId = ref(templates[0]!.id)
const layout = computed(() => allTemplates.value.find(t => t.id === templateId.value) ?? templates[0]!)
const storeName = ref(layout.value.store)
watch(layout, (t) => { if (t.store) storeName.value = t.store })

// ---- Step 2: photos ----
// Photos are grouped by part number, so DF_61040036_Ang + DF_61040036_Fro are one rotor
interface Photo { id: number, file: File, url: string, key: string, part: string, view: string }
interface PartGroup { key: string, part: string, photos: Photo[], photo: Photo }

let nextId = 1
const photos = reactive<Record<PhotoKind, Photo[]>>({ rotor: [], pad: [] })
// Part numbers typed by the user, by group key
const partEdits = reactive<Record<string, string>>({})
// Which photo of a group is used, by group key (defaults to the angled shot for rotors)
const photoPick = reactive<Record<string, number>>({})

function addPhotos(kind: PhotoKind, files: File[]) {
  for (const file of files) {
    const { part, view } = parsePhotoName(file.name)
    const key = `${kind}:${(part || file.name).toUpperCase()}`
    photos[kind].push({ id: nextId++, file, url: URL.createObjectURL(file), key, part, view })
    partEdits[key] ??= part
  }
  syncListings()
}

function removeGroup(kind: PhotoKind, key: string) {
  photos[kind] = photos[kind].filter((p) => {
    if (p.key === key) URL.revokeObjectURL(p.url)
    return p.key !== key
  })
  delete partEdits[key]
  delete photoPick[key]
  syncListings()
}

onBeforeUnmount(() => {
  for (const p of [...photos.rotor, ...photos.pad]) URL.revokeObjectURL(p.url)
  if (ownBase.value) URL.revokeObjectURL(ownBase.value.url)
  clearResults()
})

function groupsOf(kind: PhotoKind): PartGroup[] {
  const map = new Map<string, Photo[]>()
  for (const p of photos[kind]) map.set(p.key, [...(map.get(p.key) ?? []), p])
  return [...map].map(([key, list]) => {
    const picked = list.find(p => p.id === photoPick[key])
      ?? (kind === 'rotor' ? list.find(p => p.view.startsWith('ang')) : undefined)
      ?? list[0]!
    return { key, part: partEdits[key] ?? list[0]!.part, photos: list, photo: picked }
  })
}
const rotors = computed(() => groupsOf('rotor'))
const pads = computed(() => groupsOf('pad'))
const groupByKey = computed(() => new Map([...rotors.value, ...pads.value].map(g => [g.key, g])))

// ---- Step 3: listings (one rotor + one pad set = one final image) ----
interface Listing { id: number, rotor: string, pad: string }
const listings = ref<Listing[]>([])

// New photos fill empty slots in order, adding listings as needed; removed photos free their slot
function syncListings() {
  const keys = groupByKey.value
  for (const l of listings.value) {
    if (!keys.has(l.rotor)) l.rotor = ''
    if (!keys.has(l.pad)) l.pad = ''
  }
  for (const kind of ['rotor', 'pad'] as const) {
    const used = new Set(listings.value.map(l => l[kind]))
    const fresh = (kind === 'rotor' ? rotors.value : pads.value).filter(g => !used.has(g.key))
    for (const g of fresh) {
      const slot = listings.value.find(l => !l[kind])
      if (slot) slot[kind] = g.key
      else listings.value.push({ id: nextId++, rotor: kind === 'rotor' ? g.key : '', pad: kind === 'pad' ? g.key : '' })
    }
  }
  listings.value = listings.value.filter(l => l.rotor || l.pad)
}

function addListing() {
  listings.value.push({ id: nextId++, rotor: rotors.value[0]?.key ?? '', pad: pads.value[0]?.key ?? '' })
}

function filenameFor(l: Listing) {
  return finalFilename(storeName.value, groupByKey.value.get(l.rotor)?.part ?? '', groupByKey.value.get(l.pad)?.part ?? '')
}

const ready = computed(() => listings.value.filter(l => l.rotor && l.pad))

// ---- Step 4: generate ----
interface Result { id: number, filename: string, url: string, blob: Blob }
const results = ref<Result[]>([])
const failures = ref<string[]>([])
const progress = ref('')
const generating = ref(false)

function clearResults() {
  for (const r of results.value) URL.revokeObjectURL(r.url)
  results.value = []
  failures.value = []
}

async function generateAll() {
  if (!ready.value.length || generating.value) return
  generating.value = true
  clearResults()
  const todo = ready.value.slice()
  const names = new Set<string>()
  for (const [i, l] of todo.entries()) {
    progress.value = `Creating image ${i + 1} of ${todo.length}…`
    let filename = filenameFor(l)
    // Same rotor + pad twice would overwrite each other in the ZIP
    for (let n = 2; names.has(filename); n++) filename = filenameFor(l).replace(/_Final\.jpg$/, `_Final_${n}.jpg`)
    names.add(filename)
    try {
      const blob = await composeListing(layout.value, groupByKey.value.get(l.rotor)!.photo.file, groupByKey.value.get(l.pad)!.photo.file)
      results.value.push({ id: l.id, filename, url: URL.createObjectURL(blob), blob })
    } catch (e) {
      failures.value.push(`${filename}: ${(e as Error).message || 'could not read one of the photos.'}`)
    }
  }
  progress.value = ''
  generating.value = false
}

function save(blob: Blob, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

async function downloadZip() {
  const files: Record<string, [Uint8Array, { level: 0 }]> = {}
  for (const r of results.value) files[r.filename] = [new Uint8Array(await r.blob.arrayBuffer()), { level: 0 }]
  const zip = zipSync(files)
  const store = storeName.value.replace(/[^A-Za-z0-9_-]/g, '') || 'Store'
  save(new Blob([zip as Uint8Array<ArrayBuffer>], { type: 'application/zip' }), `${store}_Listings.zip`)
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
        <h2><span class="step">1</span> Template</h2>
        <p class="muted">Branding, logos, hardware, text and layout stay exactly as in the template — only the rotors and pads are swapped.</p>

        <div class="tpl-grid">
          <button
            v-for="t in allTemplates"
            :key="t.id"
            type="button"
            class="tpl"
            :class="{ selected: t.id === templateId }"
            @click="templateId = t.id"
          >
            <img :src="t.src" :alt="t.name">
            <span>{{ t.name }}</span>
          </button>
        </div>

        <details class="own" :open="!!ownBase">
          <summary>Use your own template</summary>
          <p class="small muted">For another brand: upload a square template without products. Rotors and pads go in the same spots as above.</p>
          <div v-if="ownBase" class="part">
            <img :src="ownBase.url" alt="Your template">
            <div class="part-body">
              <span class="small">{{ ownBase.file.name }}</span>
              <button type="button" class="btn-text danger" :disabled="generating" @click="setOwn(null)">Remove</button>
            </div>
          </div>
          <PhotoDrop v-else label="Drop your template here, or click to browse" @add="generating || setOwn($event)" />
        </details>

        <label class="field">
          <span>Store name (used in the file name)</span>
          <input v-model="storeName" type="text" placeholder="e.g. AleAutoParts">
        </label>
      </section>

      <!-- STEP 2 -->
      <section class="card">
        <h2><span class="step">2</span> Product photos</h2>
        <p class="muted">Drop all photos for the batch at once. Part numbers are read from file names like <code>DF_61040036_Ang.jpg</code> — check them below.</p>

        <div class="grid-2">
          <div v-for="kind in (['rotor', 'pad'] as const)" :key="kind" class="stack-sm">
            <h3>{{ kind === 'rotor' ? 'Rotors' : 'Brake pads' }}</h3>
            <PhotoDrop :label="kind === 'rotor' ? 'Drop rotor photos here, or click to browse' : 'Drop pad photos here, or click to browse'" @add="addPhotos(kind, $event)" />

            <div v-for="g in (kind === 'rotor' ? rotors : pads)" :key="g.key" class="part">
              <img :src="g.photo.url" :alt="g.part">
              <div class="part-body">
                <label class="field">
                  <span class="small">Part number</span>
                  <input v-model="partEdits[g.key]" type="text" :placeholder="g.part || 'Type part number'">
                </label>
                <div v-if="g.photos.length > 1" class="views">
                  <button
                    v-for="p in g.photos"
                    :key="p.id"
                    type="button"
                    class="view"
                    :class="{ active: p.id === g.photo.id }"
                    :title="p.file.name"
                    @click="photoPick[g.key] = p.id"
                  >
                    {{ p.view || p.file.name }}
                  </button>
                </div>
                <button type="button" class="btn-text danger" @click="removeGroup(kind, g.key)">Remove</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- STEP 3 -->
      <section class="card">
        <h2><span class="step">3</span> Listings</h2>
        <p class="muted">One image per listing. Rotors and pads are paired in the order they were added — change any pair here.</p>

        <p v-if="!listings.length" class="small muted">Add photos above to start.</p>
        <div v-for="(l, i) in listings" :key="l.id" class="listing">
          <span class="listing-no">{{ i + 1 }}</span>
          <select v-model="l.rotor" aria-label="Rotor">
            <option value="">— rotor —</option>
            <option v-for="g in rotors" :key="g.key" :value="g.key">{{ g.part || g.photo.file.name }}</option>
          </select>
          <select v-model="l.pad" aria-label="Brake pads">
            <option value="">— pads —</option>
            <option v-for="g in pads" :key="g.key" :value="g.key">{{ g.part || g.photo.file.name }}</option>
          </select>
          <code class="listing-file">{{ filenameFor(l) }}</code>
          <button type="button" class="btn-text danger" @click="listings.splice(i, 1)">Remove</button>
        </div>
        <div v-if="rotors.length && pads.length">
          <button type="button" class="btn-text" @click="addListing">+ Add listing</button>
        </div>
      </section>

      <!-- STEP 4 -->
      <section class="card">
        <h2><span class="step">4</span> Create images</h2>

        <button type="button" class="btn-primary" :disabled="!ready.length || generating" @click="generateAll">
          {{ generating ? 'Working…' : `Create ${ready.length || ''} image${ready.length === 1 ? '' : 's'}` }}
        </button>
        <p v-if="!ready.length && !generating" class="small muted center">Each listing needs a rotor and a pad photo.</p>
        <p v-if="progress" class="small center">{{ progress }}</p>
        <p v-for="f in failures" :key="f" class="alert">{{ f }}</p>

        <template v-if="results.length && !generating">
          <div class="center">
            <button type="button" class="btn-success" @click="downloadZip">Download all ({{ results.length }}) as ZIP</button>
          </div>
          <div class="results">
            <figure v-for="r in results" :key="r.filename">
              <img :src="r.url" :alt="r.filename">
              <figcaption>
                <span class="small">{{ r.filename }}</span>
                <button type="button" class="btn-text" @click="save(r.blob, r.filename)">Download</button>
              </figcaption>
            </figure>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>
