/* ============================================================================
   FLIGHT CURVES — the only part of the island manifest that touches three.
   ----------------------------------------------------------------------------
   Split out of islands.ts deliberately. The HTML panels and the nav read that
   manifest for labels, accents and blurbs, and they live in the shell chunk
   that has to paint before the 3D runtime arrives. A single `import { Vector3 }`
   in islands.ts was enough to drag all of three.js into that chunk and undo
   the entire point of lazy-loading the world.

   Keep islands.ts free of three imports.
   ========================================================================= */

import { CatmullRomCurve3, Vector3 } from 'three'
import type { FlightPath } from './islands'

/**
 * Builds the smooth curves a flight is actually flown along. CatmullRom through
 * the waypoints rather than lerping between them, so the camera arcs instead of
 * cornering — the difference between a drone shot and a robot arm.
 *
 * `centripetal` matters: with the default parameterisation, closely spaced
 * waypoints produce cusps and the camera visibly kinks. Centripetal is the
 * standard fix and costs nothing.
 */
export function buildFlightCurves(path: FlightPath): {
  position: CatmullRomCurve3
  look: CatmullRomCurve3
} {
  return {
    position: new CatmullRomCurve3(
      path.via.map((v) => new Vector3(...v)),
      false,
      'centripetal',
    ),
    look: new CatmullRomCurve3(
      path.look.map((v) => new Vector3(...v)),
      false,
      'centripetal',
    ),
  }
}
