// Builds the final listing image in the browser: no server and no AI, so every image is free
// and the template's branding is copied pixel for pixel.
import type { TemplateLayout } from './templates'

export type PhotoKind = 'rotor' | 'pad'

// Supplier file names look like DF_61040036_Ang.jpg / BR_P09004N_Bac.jpg
export function parsePhotoName(name: string) {
  const parts = name.replace(/\.[^.]+$/, '').split(/[_\s]+/).filter(Boolean)
  const part = (parts.length >= 2 ? parts[1]! : parts[0] ?? '').replace(/[^A-Za-z0-9]/g, '')
  const view = parts.length >= 3 ? parts[2]!.toLowerCase() : ''
  return { part, view }
}

// Mirrors make_final_filename() in backend/app/services.py
export function finalFilename(store: string, rotorPart: string, padPart: string) {
  const s = store.replace(/[^A-Za-z0-9_-]/g, '') || 'Store'
  const r = rotorPart.replace(/[^A-Za-z0-9]/g, '') || 'ROTOR'
  const p = padPart.replace(/[^A-Za-z0-9]/g, '') || 'PAD'
  return `${s}_${r}_${p}_Final.jpg`
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function context(c: HTMLCanvasElement) {
  return c.getContext('2d', { willReadFrequently: true })!
}

async function loadImage(src: Blob | string) {
  const blob = typeof src === 'string' ? await (await fetch(src)).blob() : src
  return createImageBitmap(blob)
}

// Template + the layer that goes on top of the products, computed once per template
const prepared = new Map<string, Promise<{ width: number, height: number, base: ImageBitmap, overlay: HTMLCanvasElement }>>()

function prepareTemplate(layout: TemplateLayout) {
  let p = prepared.get(layout.id)
  if (!p) {
    p = (async () => {
      const [base, img] = await Promise.all([loadImage(layout.src), layout.overlay ? loadImage(layout.overlay) : undefined])
      const c = canvas(base.width, base.height)
      if (img) {
        const ctx = context(c)
        ctx.drawImage(img, 0, 0, c.width, c.height)
        img.close()
        const data = ctx.getImageData(0, 0, c.width, c.height)
        const d = data.data
        const s = c.width / layout.size
        for (let Y = 0; Y < c.height; Y++) {
          for (let X = 0; X < c.width; X++) {
            const i = (Y * c.width + X) * 4
            if (layout.keep && !layout.keep(X / s, Y / s, d[i]!, d[i + 1]!, d[i + 2]!)) d[i + 3] = 0
          }
        }
        ctx.putImageData(data, 0, 0)
      }
      return { width: c.width, height: c.height, base, overlay: c }
    })()
    p.catch(() => prepared.delete(layout.id))
    prepared.set(layout.id, p)
  }
  return p
}

// Frees a template's cached layers, e.g. when the user replaces their own template
export function forgetTemplate(id: string) {
  prepared.get(id)?.then(t => t.base.close(), () => {})
  prepared.delete(id)
}

// Makes the white studio background transparent and crops to the product.
// `firstPiece` keeps only the top-left item, for pad photos that show a 2x2 set.
async function cutout(file: Blob, firstPiece: boolean) {
  const img = await loadImage(file)
  const c = canvas(img.width, img.height)
  const ctx = context(c)
  ctx.drawImage(img, 0, 0)
  img.close()
  const data = ctx.getImageData(0, 0, c.width, c.height)
  const d = data.data
  for (let i = 0; i < d.length; i += 4) {
    const max = Math.max(d[i]!, d[i + 1]!, d[i + 2]!)
    const min = Math.min(d[i]!, d[i + 1]!, d[i + 2]!)
    if (max && (max - min) / max > 0.08) continue // coloured, keep
    if (min >= 248) d[i + 3] = 0
    else if (min > 228) d[i + 3] = Math.round(255 * (248 - min) / 20)
  }
  ctx.putImageData(data, 0, 0)

  const opaque = (x: number, y: number) => d[(y * c.width + x) * 4 + 3]! > 20
  // First run of occupied columns/rows; a split needs a clear gap, so specks don't count
  const firstRun = (n: number, filled: (k: number) => boolean) => {
    const gap = Math.max(4, Math.round(n * 0.01))
    let start = -1, end = -1, empty = 0
    for (let k = 0; k < n; k++) {
      if (filled(k)) {
        if (start < 0) start = k
        end = k
        empty = 0
      } else if (start >= 0 && firstPiece && ++empty >= gap) break
    }
    return [start, end] as const
  }
  const countCol = (x: number, y0: number, y1: number) => { let n = 0; for (let y = y0; y <= y1; y++) if (opaque(x, y)) n++; return n }
  const countRow = (y: number, x0: number, x1: number) => { let n = 0; for (let x = x0; x <= x1; x++) if (opaque(x, y)) n++; return n }

  const [x0, x1] = firstRun(c.width, x => countCol(x, 0, c.height - 1) > 2)
  if (x0 < 0) throw new Error('The photo looks empty (only white background).')
  const [y0, y1] = firstRun(c.height, y => countRow(y, x0, x1) > 2)
  const out = canvas(x1 - x0 + 1, y1 - y0 + 1)
  out.getContext('2d')!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
  return out
}

export async function composeListing(layout: TemplateLayout, rotorPhoto: Blob, padPhoto: Blob) {
  const [tpl, rotor, pad] = await Promise.all([prepareTemplate(layout), cutout(rotorPhoto, false), cutout(padPhoto, true)])
  const s = tpl.width / layout.size
  const out = canvas(tpl.width, tpl.height)
  const ctx = out.getContext('2d')!
  ctx.drawImage(tpl.base, 0, 0)

  const rh = layout.rotorHeight * s
  const rw = rh * rotor.width / rotor.height
  for (const r of layout.rotors) {
    ctx.save()
    if (r.flip) {
      ctx.translate(r.x * s + rw, r.y * s)
      ctx.scale(-1, 1)
      ctx.drawImage(rotor, 0, 0, rw, rh)
    } else {
      ctx.drawImage(rotor, r.x * s, r.y * s, rw, rh)
    }
    ctx.restore()
  }

  const pw = layout.padWidth * s
  const ph = pw * pad.height / pad.width
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, .35)'
  ctx.shadowBlur = 12 * s
  ctx.shadowOffsetX = 6 * s
  ctx.shadowOffsetY = 10 * s
  for (const [x, y] of layout.pads) ctx.drawImage(pad, x * s, y * s, pw, ph)
  ctx.restore()

  ctx.drawImage(tpl.overlay, 0, 0)

  return new Promise<Blob>((resolve, reject) =>
    out.toBlob(b => (b ? resolve(b) : reject(new Error('Could not create the image.'))), 'image/jpeg', 0.92))
}
