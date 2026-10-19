// Built-in templates. Products are drawn on white, then `keep` pixels of the template are
// drawn on top — so the badge, seal, hardware and text always cover the new rotors/pads,
// exactly like the layering in the client's Canva design.
// All coordinates are measured on a `size`-wide copy of the template and scaled at runtime.

export interface TemplateLayout {
  id: string
  name: string
  src: string
  store: string
  size: number
  rotorHeight: number
  // Back to front; `flip` mirrors the photo horizontally
  rotors: { x: number, y: number, flip?: boolean }[]
  padWidth: number
  pads: [number, number][]
  keep: (x: number, y: number, r: number, g: number, b: number) => boolean
}

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b

function inPolygon(x: number, y: number, poly: [number, number][]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!
    const [xj, yj] = poly[j]!
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

const illustrationBadge: [number, number][] = [[0, 912], [17, 895], [373, 960], [342, 1132], [0, 1132]]

export const templates: TemplateLayout[] = [
  {
    id: 'brembo-ale',
    name: 'Brembo + ALE — Disc Brake Pads & Rotors',
    src: '/templates/brembo-ale.png',
    store: 'AleAutoParts',
    size: 1350,
    rotorHeight: 760,
    rotors: [{ x: 70, y: 305, flip: true }, { x: 255, y: 300 }],
    padWidth: 335,
    pads: [[685, 560], [985, 665], [685, 770], [985, 870]],
    // This template still has the old products baked in, so the masks below cut around
    // them. With a clean Canva export (no rotors/pads) most of this goes away.
    keep: (x, y, r, g, b) => {
      const notWhite = Math.min(r, g, b) < 238
      return y < 250 || y >= 1130 // header logos, footer text
        || (x >= 590 && y < 272 && r > 170 && g < 110) // red rule under the logo
        || inPolygon(x, y, illustrationBadge)
        || (x - 1182) ** 2 + (y - 400) ** 2 < 126 ** 2 // OEM seal
        || (notWhite && x >= 1150 && x <= 1310 && y >= 430 && y <= 630) // hardware on the seal
        || (notWhite && x >= 28 && x <= 222 && y >= 232 && y <= 318) // top-left clip
        || (notWhite && y > 318 && y <= 488 && ((x >= 70 && x <= 95) || (x >= 120 && x <= 137))) // its pins
        || (x >= 560 && y >= 1055 && y < 1130 && r - b > 60 && lum(r, g, b) > 120) // yellow slogan
    }
  }
]
