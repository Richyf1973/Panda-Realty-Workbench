// Generates branded home-screen icons for the seller/buyer portals.
// Composites the Panda Realty logo onto a solid white square tile so the
// saved Add-to-Home-Screen shortcut looks intentional (iOS adds no background).
//
// Run: node apps/panda-realty/tools/generate-home-screen-icons.mjs

import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import sharp from "sharp"

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = join(here, "..", "public")
const logoPath = join(publicDir, "panda-realty-logo-nobg.png")
const outDir = join(publicDir, "icons")

const TARGETS = [
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
]

async function buildIcon(size) {
  const padding = Math.round(size * 0.12)
  const inner = size - padding * 2
  const logo = await sharp(logoPath)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .toBuffer()

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
}

async function main() {
  await mkdir(outDir, { recursive: true })
  for (const { name, size } of TARGETS) {
    const out = join(outDir, name)
    await (await buildIcon(size)).toFile(out)
    console.log(`wrote ${out} (${size}x${size})`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
