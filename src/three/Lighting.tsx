/* ============================================================================
   LIGHTING — dusk, committed to (spec §8).
   ----------------------------------------------------------------------------
   The sun sits LOW and to the LEFT, matching the glow baked into Sky.tsx. If
   those two disagree the scene reads as lit by nothing in particular, which is
   the most common tell of an auto-generated 3D scene.

   > DEVIATION: §8 asks for an AmbientLight as the global fill. Using a
   > HemisphereLight instead. Identical cost — both are analytic, no shadow
   > map, no extra draw — but ambient adds the same value to every face, which
   > flattens exactly the faceting that low-poly depends on. A hemisphere light
   > tints up-facing planes with the sky colour and down-facing ones with
   > ground bounce, so facets stay separated even in shadow, which is precisely
   > what §8 asks for ("readable in shadowed areas rather than going pure
   > black"). AmbientLight is its degenerate case (sky == ground).

   The focus rim light is the optional extra from §8: a dim, coloured light
   that fades in on whichever island is active, so "this one is lit up right
   now" without repainting the scene.
   ========================================================================= */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Vector3, type DirectionalLight, type HemisphereLight, type PointLight } from 'three'
import { getIsland } from '../lib/islands'
import { useExperience } from '../lib/experience'
import { damp } from '../lib/motion'
import type { QualitySettings } from '../lib/quality'

/** Low and left. Long raking shadows across the island tops. */
export const KEY_POSITION: [number, number, number] = [-18, 24, 16]

const SHADOW_EXTENT = 22

export default function Lighting({ quality }: { quality: QualitySettings }) {
  const { frame, activeIsland, flightIsland } = useExperience()
  const keyRef = useRef<DirectionalLight>(null)
  const fillRef = useRef<HemisphereLight>(null)
  const rimRef = useRef<PointLight>(null)
  const rimColor = useRef(new Color('#3B82F6'))

  /* Day and night ends of every light, resolved once. The frame loop only
     lerps between them, so switching the theme costs nothing per frame. */
  const palette = useMemo(
    () => ({
      keyDay: new Color('#FFF1C7'),
      keyNight: new Color('#8AA6DE'),
      skyDay: new Color('#E6F6FF'),
      skyNight: new Color('#2A3E63'),
      groundDay: new Color('#8B7963'),
      groundNight: new Color('#161C2B'),
      sunPos: new Vector3(...KEY_POSITION),
      /* NOT the moon's drawn position. The moon disc sits low and slightly
         below the horizon so that it lands inside the establishing shot, which
         looks after the camera; pointing the key light at it put the light
         source UNDER the islands, shining upward, and every shadow disappeared.

         The light gets its own bearing: high, cool, and on the opposite side
         from the daytime sun so the shadows visibly swing when the theme
         changes. Real moonlight is a hard directional source and this is what
         it should behave like. */
      moonPos: new Vector3(20, 27, -14),
    }),
    [],
  )
  const scratchColor = useRef(new Color())
  const scratchVec = useRef(new Vector3())

  const focus = activeIsland ?? flightIsland

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1)
    const presence = frame.current.islandPresence
    const night = frame.current.nightPresence

    const key = keyRef.current
    if (key) {
      /* Moonlight is the same physics as sunlight, just weaker and colder, so
         the key light moves to the moon's bearing rather than a second light
         being switched on. That keeps exactly one shadow-casting source in the
         scene at any time, which is what the performance budget can afford. */
      scratchVec.current.copy(palette.sunPos).lerp(palette.moonPos, night)
      key.position.copy(scratchVec.current)
      scratchColor.current.copy(palette.keyDay).lerp(palette.keyNight, night)
      key.color.copy(scratchColor.current)
      /* Moonlight is dim, but it is still a single hard source and it still casts
         shadows. Dropping it to near zero at night threw away the faceting that
         makes these shapes read at all, so it keeps enough intensity to throw a
         real shadow and the darkness comes from exposure instead. */
      key.intensity = (2.8 - night * 1.55) * presence
    }

    const fill = fillRef.current
    if (fill) {
      scratchColor.current.copy(palette.skyDay).lerp(palette.skyNight, night)
      fill.color.copy(scratchColor.current)
      scratchColor.current.copy(palette.groundDay).lerp(palette.groundNight, night)
      fill.groundColor.copy(scratchColor.current)
      // Night keeps a little more ambient than is strictly realistic. A
      // physically honest night is a black screen, and the faceting has to stay
      // readable for the islands to still be worth looking at.
      fill.intensity = 1.2 - night * 1.0
    }

    const rim = rimRef.current
    if (rim) {
      if (focus) {
        const island = getIsland(focus)
        rimColor.current.set(island.accent)
        rim.color.lerp(rimColor.current, 1 - Math.exp(-6 * dt))
        rim.position.set(
          island.position[0],
          island.position[1] + 2.6,
          island.position[2] + 3.2,
        )
      }
      // The accent rim carries more of the frame at night, where there is far
      // less key light for it to compete with.
      rim.intensity = damp(rim.intensity, focus ? 26 + night * 14 : 0, 3.4, dt)
    }
  })

  return (
    <>
      <hemisphereLight
        ref={fillRef}
        // Sky tint from the zenith, ground bounce warmed by the sun. Both ends
        // are driven per frame above; these are just the day defaults.
        color="#E6F6FF"
        groundColor="#8B7963"
        intensity={1.2}
      />

      <directionalLight
        ref={keyRef}
        position={KEY_POSITION}
        color="#FFF1C7"
        intensity={2.8}
        castShadow={quality.shadows}
        shadow-mapSize-width={quality.shadowMapSize}
        shadow-mapSize-height={quality.shadowMapSize}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-near={1}
        shadow-camera-far={70}
        // normalBias handles acne on the broad island tops; a plain negative
        // bias alone peter-pans the thin structures standing on them.
        shadow-normalBias={0.045}
        shadow-bias={-0.0004}
      />

      {/* Focus rim (§8). Point light rather than directional so it falls off
          and stays local to the island it belongs to. */}
      <pointLight ref={rimRef} intensity={0} distance={26} decay={1.6} color="#3B82F6" />
    </>
  )
}
