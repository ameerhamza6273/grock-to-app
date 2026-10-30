// Built-in templates, layered like the client's Canva design: `src` (blank template) at the
// back, then the product photos, then the `keep` pixels of `overlay` on top — so the badge,
// slogan and rules always cover the new products.
// All coordinates are measured on a `size`-wide copy of the template and scaled at runtime.

export type PartKind = 'rotor' | 'pad' | 'item'

export const kindLabels: Record<PartKind, { many: string, one: string }> = {
  rotor: { many: 'Rotors', one: 'rotor' },
  pad: { many: 'Brake pads', one: 'pad' },
  item: { many: 'Products', one: 'product' }
}

// Where one photo is drawn. With `w`, the photo is fitted inside the w×h box and centred;
// without it, it is drawn `h` tall from (x, y). `flip` mirrors it horizontally.
export interface Placement { x: number, y: number, w?: number, h: number, flip?: boolean }

// One photo per listing, e.g. "Front pads". Its part number goes into the file name, in order.
export interface PartSlot {
  kind: PartKind
  label: string
  // Back to front; a photo is never split, only drawn whole at each placement
  at: Placement[]
  shadow?: boolean
}

export interface TemplateLayout {
  id: string
  name: string
  src: string
  overlay?: string
  store: string
  size: number
  parts: PartSlot[]
  keep?: (x: number, y: number, r: number, g: number, b: number) => boolean
}

function inPolygon(x: number, y: number, poly: [number, number][]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!
    const [xj, yj] = poly[j]!
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

const illustrationBadge: [number, number][] = [[0, 983], [17, 893], [372, 960], [338, 1130], [0, 1130]]

// Rotors + pads — also used for the user's own template
const rotorAndPads = {
  size: 1350,
  parts: [
    { kind: 'rotor', label: 'Rotor', at: [{ x: 70, y: 305, h: 760, flip: true }, { x: 255, y: 300, h: 760 }] },
    // The pad photo is a full set (client rule: place as-is, never duplicate)
    { kind: 'pad', label: 'Pads', at: [{ x: 690, y: 545, w: 620, h: 570 }], shadow: true }
  ] as PartSlot[]
}

export const templates: TemplateLayout[] = [
  {
    id: 'brembo-ale',
    name: 'Brembo + ALE — Disc Brake Pads & Rotors',
    src: '/templates/brembo-ale.png',
    overlay: '/templates/brembo-ale-top.png',
    store: 'AleAutoParts',
    ...rotorAndPads,
    // The overlay is on white: keep what is coloured plus the badge (its text is white). The
    // footer band is in the base and sits in front, so nothing below its top edge is kept.
    keep: (x, y, r, g, b) => y < 1130 && (Math.min(r, g, b) < 230 || inPolygon(x, y, illustrationBadge))
  },
  {
    id: 'garnius-single',
    name: 'Garnius — Single item',
    src: '/templates/garnius.jpg',
    overlay: '/templates/garnius.jpg',
    store: 'Garnius',
    size: 1600,
    // Centred in the white area between the banner and the footer line
    parts: [{ kind: 'item', label: 'Product', at: [{ x: 100, y: 500, w: 1400, h: 870 }], shadow: true }],
    // The round badge stays in front of wide products
    keep: (x, y) => Math.hypot(x - 1428, y - 422) < 151
  }
]

// A blank template the user uploads (e.g. another brand): products go in the Brembo spots, on top
export function customTemplate(id: string, src: string): TemplateLayout {
  return { id, name: 'Your template', src, store: '', ...rotorAndPads }
}
