/* ============================================================================
   CAMERA FRAMING — one place that knows how the lens reacts to the viewport.
   ----------------------------------------------------------------------------
   A perspective camera's fov is VERTICAL. On a portrait phone the same fov
   shows a far narrower slice horizontally, and a composition framed on a laptop
   arrives cropped through the middle.

   Widening the fov alone cannot fix it — holding desktop horizontal coverage at
   a phone's ~0.46 aspect would need a ~112° vertical fov, i.e. a fisheye. So
   framing is two knobs: widen moderately, then dolly back along the view vector
   to recover the rest.
   ========================================================================= */

import { MathUtils, Vector3 } from 'three'

export const BASE_FOV = 42
const REFERENCE_ASPECT = 16 / 9
const MAX_FOV = 58
const MAX_DOLLY = 1.9

export interface Framing {
  fov: number
  dolly: number
}

function halfExtent(fovDeg: number, aspect: number): number {
  return Math.tan(MathUtils.degToRad(fovDeg) / 2) * aspect
}

const REFERENCE_HALF_EXTENT = halfExtent(BASE_FOV, REFERENCE_ASPECT)

export function framingForAspect(aspect: number): Framing {
  if (aspect >= REFERENCE_ASPECT) return { fov: BASE_FOV, dolly: 1 }
  const targetHorizontal = 2 * Math.atan(REFERENCE_HALF_EXTENT)
  const ideal = MathUtils.radToDeg(2 * Math.atan(Math.tan(targetHorizontal / 2) / aspect))
  const fov = Math.min(MAX_FOV, ideal)
  const dolly = Math.min(MAX_DOLLY, Math.max(1, REFERENCE_HALF_EXTENT / halfExtent(fov, aspect)))
  return { fov, dolly }
}

/** Portrait gets the bottom-sheet layout, landscape the side panel. */
export function isPortrait(aspect: number): boolean {
  return aspect < 1
}

/**
 * Applies the dolly to a pose: pushes the camera away from its target along the
 * existing view vector, preserving the composition and the lens character.
 */
export function applyDolly(position: Vector3, target: Vector3, dolly: number): void {
  if (dolly === 1) return
  const view = position.clone().sub(target)
  position.copy(target).addScaledVector(view, dolly)
}

/* ----------------------------------------------------------------------------
   SKY-VIEW FIT SOLVER
   ----------------------------------------------------------------------------
   The three islands span ~14 world units horizontally against ~5 vertically —
   a strongly landscape composition. On a 0.46-aspect phone that simply does not
   fit at the authored distance, and the generic dolly clamp is not enough: the
   Projects island ran off the right edge.

   Rather than hand-tuning a second set of positions per orientation (which
   would mean maintaining two art directions and two sets of flight paths), the
   sky camera solves for the distance that fits everything. The authored
   look-at is preserved exactly, so the asymmetric composition survives — only
   the dolly changes. On a 16:9 desktop the solver returns 1 and nothing moves.
   -------------------------------------------------------------------------- */

import { PerspectiveCamera } from 'three'

export interface FitSphere {
  center: Vector3
  radius: number
}

export function solveFitMultiplier(
  cameraPos: Vector3,
  target: Vector3,
  spheres: FitSphere[],
  aspect: number,
  fov: number,
  margin = 0.88,
): number {
  const tanHalf = Math.tan(MathUtils.degToRad(fov) / 2)
  const probe = new PerspectiveCamera(fov, aspect, 0.1, 500)
  const view = cameraPos.clone().sub(target)
  const pos = new Vector3()
  const ndc = new Vector3()

  const fits = (multiplier: number): boolean => {
    pos.copy(target).addScaledVector(view, multiplier)
    probe.position.copy(pos)
    probe.lookAt(target)
    probe.updateMatrixWorld()
    probe.updateProjectionMatrix()

    for (const sphere of spheres) {
      ndc.copy(sphere.center).project(probe)
      const angular = sphere.radius / pos.distanceTo(sphere.center) / tanHalf
      if (Math.abs(ndc.y) + angular > margin) return false
      if (Math.abs(ndc.x) + angular / aspect > margin) return false
    }
    return true
  }

  if (fits(1)) return 1

  let lo = 1
  let hi = 6
  if (!fits(hi)) return hi // give up gracefully rather than looping
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (fits(mid)) hi = mid
    else lo = mid
  }
  return hi
}
