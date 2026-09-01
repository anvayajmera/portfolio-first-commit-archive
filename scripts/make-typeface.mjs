/* ============================================================================
   TYPEFACE GENERATOR — builds the JSON font that <Text3D> extrudes.
   ----------------------------------------------------------------------------
   three's FontLoader wants a "typeface.json": glyph outlines encoded as a token
   stream. The usual way to get one is to upload a font to facetype.js and paste
   the result. That is a manual step nobody remembers a year later, and it ships
   the entire Latin set (~200 kB) when the site extrudes exactly eleven distinct
   characters.

   So this generates it at build time instead, subset to the characters the
   wordmark actually uses. Pipeline:

     @fontsource woff2  ->  wawoff2 (decompress)  ->  ttf
                        ->  opentype.js (parse outlines)
                        ->  typeface JSON (subset)

   Token format, verified against three/examples/jsm/loaders/FontLoader.js:
     m x y                          moveTo
     l x y                          lineTo
     q  endX endY  cpX cpY          quadratic — END POINT FIRST
     b  endX endY  cp1X cp1Y  cp2X cp2Y   cubic — END POINT FIRST

   That argument order is genuinely surprising (every other path API in
   existence puts control points first), and getting it wrong yields glyphs
   that look like crumpled foil. Hence the comment.
   ========================================================================= */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import opentype from 'opentype.js'
import wawoff2 from 'wawoff2'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const SOURCE_WOFF2 = path.join(
  root,
  'node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2',
)
const OUT = path.join(root, 'public/fonts/wordmark.typeface.json')

/* The wordmark, plus the rest of the alphabet's uppercase and the space —
   cheap insurance so the name can be changed without regenerating, while still
   coming in far under a full Latin subset. */
const CHARSET = Array.from(
  new Set(('Anvay Ajmera' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz' + ' .-&_|').split('')),
)

/** opentype.js commands -> three's typeface token stream. */
function encodeOutline(glyph) {
  const tokens = []
  for (const cmd of glyph.path.commands) {
    switch (cmd.type) {
      case 'M':
        tokens.push('m', r(cmd.x), r(cmd.y))
        break
      case 'L':
        tokens.push('l', r(cmd.x), r(cmd.y))
        break
      case 'Q':
        // end point, then control point
        tokens.push('q', r(cmd.x), r(cmd.y), r(cmd.x1), r(cmd.y1))
        break
      case 'C':
        // end point, then both control points
        tokens.push('b', r(cmd.x), r(cmd.y), r(cmd.x1), r(cmd.y1), r(cmd.x2), r(cmd.y2))
        break
      case 'Z':
        // Typeface outlines are implicitly closed; FontLoader has no 'z' token.
        break
      default:
        throw new Error(`Unhandled path command: ${cmd.type}`)
    }
  }
  return tokens.join(' ')
}

/** Two decimals is well below one device pixel at any realistic type size. */
function r(n) {
  return Math.round(n * 100) / 100
}

async function main() {
  if (!fs.existsSync(SOURCE_WOFF2)) {
    throw new Error(`Source font missing: ${SOURCE_WOFF2}`)
  }

  const ttf = await wawoff2.decompress(fs.readFileSync(SOURCE_WOFF2))
  const font = opentype.parse(Uint8Array.from(ttf).buffer)

  const glyphs = {}
  const missing = []

  for (const char of CHARSET) {
    const glyph = font.charToGlyph(char)
    if (!glyph || glyph.index === 0) {
      missing.push(char)
      continue
    }
    const bbox = glyph.getBoundingBox()
    glyphs[char] = {
      ha: r(glyph.advanceWidth),
      x_min: r(Number.isFinite(bbox.x1) ? bbox.x1 : 0),
      x_max: r(Number.isFinite(bbox.x2) ? bbox.x2 : 0),
      o: encodeOutline(glyph),
    }
  }

  if (missing.length) {
    console.warn(`  warn  no glyph for: ${missing.map((c) => JSON.stringify(c)).join(', ')}`)
  }

  const typeface = {
    glyphs,
    familyName: 'Space Grotesk',
    ascender: r(font.ascender),
    descender: r(font.descender),
    underlinePosition: -100,
    underlineThickness: 50,
    boundingBox: {
      yMin: r(font.tables.head.yMin),
      xMin: r(font.tables.head.xMin),
      yMax: r(font.tables.head.yMax),
      xMax: r(font.tables.head.xMax),
    },
    resolution: font.unitsPerEm,
    original_font_information: {
      font_family_name: 'Space Grotesk',
      font_subfamily_name: 'Bold',
    },
    cssFontWeight: 'bold',
    cssFontStyle: 'normal',
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(typeface))

  const kb = (fs.statSync(OUT).size / 1024).toFixed(1)
  console.log(`  ok    ${Object.keys(glyphs).length} glyphs -> public/fonts/wordmark.typeface.json (${kb} kB)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
