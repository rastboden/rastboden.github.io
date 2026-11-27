// Generates every app icon in public/ from the glyph below.
//
//   node scripts/generate-icons.mjs
//
// iOS and Android crop icons differently, so they get different artwork:
//  - iOS masks the full square itself, so the apple-touch icon is an opaque
//    full-bleed square (transparency would turn black).
//  - Android only guarantees the centre 80 % of a maskable icon, so that one is
//    full-bleed too, with a smaller glyph that stays inside the safe zone.
//  - Everything else (favicon, desktop install) is shown as-is and gets its own
//    rounded corners.
//
// sharp is installed as a dependency of @vite-pwa/assets-generator.
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const BG = '#0f766e' // keep in sync with theme_color in vite.config.ts
const FG = '#ffffff'
const ACCENT = '#fbbf24'

// "R" with a ball in its bowl, drawn in a 512 box and centred on 256,256.
const GLYPH = `
    <g transform="translate(-6 -4)" fill="none" stroke="${FG}" stroke-width="48" stroke-linecap="round" stroke-linejoin="round">
      <path d="M188 380V140h74a74 74 0 0 1 0 148h-74"/>
      <path d="M254 288l68 92"/>
      <circle cx="260" cy="214" r="30" fill="${ACCENT}" stroke="none"/>
    </g>`

/**
 * @param {object} options
 * @param {number} options.scale  glyph size relative to the Android safe zone
 * @param {number} [options.radius]  corner radius; 0 gives a full-bleed square
 */
function svg({ scale, radius = 0 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${BG}"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${GLYPH}
  </g>
</svg>
`
}

const rounded = svg({ scale: 1.15, radius: 112 })
const fullBleed = svg({ scale: 1.15 })
const maskable = svg({ scale: 1 })

const publicDir = fileURLToPath(new URL('../public/', import.meta.url))
const png = (source, size) => sharp(Buffer.from(source), { density: 300 }).resize(size, size).png()

/** A single-image .ico is a 22-byte header followed by an ordinary PNG. */
function ico(pngBuffer, size) {
  const header = Buffer.alloc(22)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(1, 4) // image count
  header.writeUInt8(size, 6)
  header.writeUInt8(size, 7)
  header.writeUInt16LE(1, 10) // colour planes
  header.writeUInt16LE(32, 12) // bits per pixel
  header.writeUInt32LE(pngBuffer.length, 14)
  header.writeUInt32LE(header.length, 18) // offset of the image data
  return Buffer.concat([header, pngBuffer])
}

await writeFile(publicDir + 'logo.svg', rounded)
for (const size of [64, 192, 512]) {
  await png(rounded, size).toFile(`${publicDir}pwa-${size}x${size}.png`)
}
await png(maskable, 512).flatten({ background: BG }).toFile(publicDir + 'maskable-icon-512x512.png')
await png(fullBleed, 180).flatten({ background: BG }).toFile(publicDir + 'apple-touch-icon-180x180.png')
await writeFile(publicDir + 'favicon.ico', ico(await png(rounded, 48).toBuffer(), 48))

console.log('Icons written to public/')
