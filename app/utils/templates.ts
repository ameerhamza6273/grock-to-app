// Built-in templates, layered like the client's Canva design: `src` (blank template) at the
// back, then the rotors/pads, then the `keep` pixels of `overlay` on top — so the badge,
// slogan and rules always cover the new products.
// All coordinates are measured on a `size`-wide copy of the template and scaled at runtime.

export interface TemplateLayout {
  id: string
  name: string
  src: string
  overlay: string
  store: string
  size: number
  rotorHeight: number
  // Back to front; `flip` mirrors the photo horizontally
  rotors: { x: number, y: number, flip?: boolean }[]
  padWidth: number
  pads: [number, number][]
  keep: (x: number, y: number, r: number, g: number, b: number) => boolean
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

const illustrationBadge: [number, number][] = [[0, 983], [17, 893], [372, 960], [338, 1131], [0, 1131]]

export const templates: TemplateLayout[] = [
  {
    id: 'brembo-ale',
    name: 'Brembo + ALE — Disc Brake Pads & Rotors',
    src: '/templates/brembo-ale.jpg',
    overlay: '/templates/brembo-ale-top.jpg',
    store: 'AleAutoParts',
    size: 1350,
    rotorHeight: 760,
    rotors: [{ x: 70, y: 305, flip: true }, { x: 255, y: 300 }],
    padWidth: 335,
    pads: [[685, 560], [985, 665], [685, 770], [985, 870]],
    // The overlay is on white: keep what is coloured plus the badge (its text is white). The
    // footer band is in the base and sits in front, so nothing below its top edge is kept.
    keep: (x, y, r, g, b) => y < 1131 && (Math.min(r, g, b) < 230 || inPolygon(x, y, illustrationBadge))
  }
]
