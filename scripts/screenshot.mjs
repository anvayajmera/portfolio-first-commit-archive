/* Visual check harness. Renders the site in headless Chromium with real
   WebGL (SwiftShader) and writes PNGs, so art-direction changes can be looked
   at rather than guessed at.

   Usage:
     node scripts/screenshot.mjs
     W=390 H=844 SHOTS='[{"wait":6500,"name":"mobile"}]' node scripts/screenshot.mjs

   SHOTS is a list of steps: {wait, click, after, name}. Console errors from the
   page are reported at the end. */

import { chromium } from 'playwright'

const URL = process.env.URL || 'http://localhost:5173/'
const OUT = process.env.OUT || '/tmp/shots'
const W = Number(process.env.W || 1600)
const H = Number(process.env.H || 900)

const browser = await chromium.launch({
  headless: true,
  args: [
    // SwiftShader gives real WebGL in headless. Without it the canvas is blank
    // and every screenshot is a lie.
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
  ],
})
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })

const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message))

await page.goto(URL, { waitUntil: 'networkidle' })

const shots = JSON.parse(process.env.SHOTS || '[]')
for (const s of shots) {
  if (s.wait) await page.waitForTimeout(s.wait)
  if (s.click) { try { await page.click(s.click, { timeout: 4000 }) } catch (e) { errors.push('click failed ' + s.click) } }
  if (s.after) await page.waitForTimeout(s.after)
  if (s.name) await page.screenshot({ path: `${OUT}/${s.name}.png` })
}

console.log(errors.length ? 'CONSOLE ERRORS:\n' + errors.slice(0, 12).join('\n') : 'no console errors')
await browser.close()
