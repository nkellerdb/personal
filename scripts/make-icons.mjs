// Renders public/favicon.svg to the PNG icons the manifest and iOS need.
// Usage: npm run icons  (uses the Playwright/Chromium available on the machine)
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
// createRequire honours NODE_PATH, so a globally installed Playwright works too.
const { chromium } = createRequire(import.meta.url)('playwright')

const svg = readFileSync('public/favicon.svg', 'utf8')
const targets = [
  ['public/icon-192.png', 192, 0],
  ['public/icon-512.png', 512, 0],
  ['public/apple-touch-icon.png', 180, 0],
  // Maskable: full-bleed background with the glyph inside the 80% safe zone.
  ['public/icon-512-maskable.png', 512, 0.12],
]

const browser = await chromium.launch()
const page = await browser.newPage()
for (const [file, size, inset] of targets) {
  await page.setViewportSize({ width: size, height: size })
  const inner = svg.replace('rx="112"', inset ? 'rx="0"' : 'rx="112"')
  await page.setContent(
    `<body style="margin:0;background:#0e0f12;display:grid;place-items:center;width:${size}px;height:${size}px">
       <div style="width:${size * (1 - inset * 2)}px;height:${size * (1 - inset * 2)}px">${inner.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
     </body>`,
  )
  await page.screenshot({ path: file, omitBackground: !inset && !file.includes('apple') })
  console.log('wrote', file)
}
await browser.close()
