/* ============================================================================
   SCENE POSES — solved once per viewport, shared by the camera and the fog.
   ----------------------------------------------------------------------------
   The sky camera's distance is not authored, it is solved: the three islands
   span a strongly landscape composition and a portrait phone has to dolly back
   to fit them. Fog needs the same number (its near/far have to scale with how
   far away the camera ended up, or the islands drown in haze on mobile), so
   the solve lives here rather than inside the camera controller.
   ========================================================================= */

import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import {
  FRAMING_SHIFT_LANDSCAPE,
  FRAMING_SHIFT_PORTRAIT,
  ISLANDS,
  SKY_CAMERA,
  SKY_TARGET,
  tvSettlePose,
} from '../lib/islands'
import { framingForAspect, isPortrait, solveFitMultiplier } from '../lib/camera'

export interface Pose {
  position: Vector3
  target: Vector3
}

export interface ScenePoses {
  sky: Pose
  island: Map<string, Pose>
  /** How far the sky view had to back off to fit everything. 1 on desktop. */
  fit: number
  fov: number
  portrait: boolean
}

export function useScenePoses(): ScenePoses {
  const size = useThree((s) => s.size)
  const aspect = size.width / size.height

  return useMemo<ScenePoses>(() => {
    const framing = framingForAspect(aspect)
    const portrait = isPortrait(aspect)
    const shift = new Vector3(...(portrait ? FRAMING_SHIFT_PORTRAIT : FRAMING_SHIFT_LANDSCAPE))

    /* Portrait aims higher than landscape. The three islands are a wide, flat
       composition; dropped into a tall frame they sat in the upper third with
       half the screen left as empty blue. Raising the look-at pitches the
       camera up, which pushes the world down into the middle of the frame, and
       a looser fit margin lets it come closer at the same time. */
    const skyTarget = new Vector3(...SKY_TARGET)
    if (portrait) skyTarget.y += 3.2
    const fit = solveFitMultiplier(
      new Vector3(...SKY_CAMERA),
      skyTarget,
      ISLANDS.map((i) => ({ center: new Vector3(...i.position), radius: i.radius })),
      aspect,
      framing.fov,
      portrait ? 1.0 : 0.88,
    )
    const skyPosition = skyTarget
      .clone()
      .addScaledVector(new Vector3(...SKY_CAMERA).sub(skyTarget), fit)

    /* Island poses are derived from where each television's picture actually
       is, not from an authored camera position. The camera has to arrive
       square to the screen for the handoff to work: the panel that opens is
       meant to read as that picture growing to fill the viewport, and a
       three-quarter view of the set breaks the illusion immediately.

       Deriving it also means the framing survives moving a television, resizing
       an island, or changing the lens on a phone. Nothing has to be re-authored
       by hand and then quietly drift out of agreement. */
    const island = new Map<string, Pose>()
    for (const def of ISLANDS) {
      /* No dolly here. `applyDolly` exists to recover horizontal coverage for
         the wide establishing shot, where a phone's narrow frame cannot hold a
         composition authored for 16:9. A parked pose has already solved its own
         distance from a target picture height using the same widened fov, so
         applying the dolly on top double-counts it and lands the television at
         half the size it asked for. */
      const pose = tvSettlePose(def, framing.fov, portrait ? 0.2 : 0.24)
      island.set(def.id, {
        position: new Vector3(...pose.position),
        target: new Vector3(...pose.target).add(shift),
      })
    }

    return { sky: { position: skyPosition, target: skyTarget }, island, fit, fov: framing.fov, portrait }
  }, [aspect])
}
