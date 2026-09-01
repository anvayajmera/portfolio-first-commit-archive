/* ============================================================================
   NIGHT SKY - moon and stars, faded in with the night theme.
   ----------------------------------------------------------------------------
   Both are real objects far out in the world rather than something painted
   into the backdrop shader. That buys correct parallax for free: the stars
   drift against the islands as the camera moves and during every flight,
   which a screen-space starfield cannot do.

   Both opt out of fog. Fog far is roughly 120 units and these sit at 240, so
   without `fog: false` they would be blended entirely into the sky colour and
   vanish the moment they were meant to appear.

   The moon is a faceted low-poly sphere, not a glowing blob. Soft translucent
   halos are the single most "generated" looking thing in a scene like this, so
   the moon reads instead as a solid object catching light, with its shading
   coming from real faceting.
   ========================================================================= */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  type Points,
  type Group,
  type MeshBasicMaterial,
  type PointsMaterial,
} from 'three'
import { useExperience } from '../lib/experience'
import type { QualitySettings } from '../lib/quality'

/** Opposite the daytime sun, so switching to night visibly changes the hour.
    Placed to land inside the establishing shot's frame, which looks down: a
    moon overhead is a moon nobody sees. */
export const MOON_POSITION: [number, number, number] = [74, -50, -170]

const STAR_RADIUS = 240

/** Deterministic PRNG so the constellation is identical on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function useStarGeometry(count: number): BufferGeometry {
  return useMemo(() => {
    const rand = mulberry32(9021)
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      /* A full sphere, not an upper hemisphere. The establishing camera pitches
         about forty degrees down to look over the islands, so the horizon is
         never in frame and an upper-hemisphere starfield sits permanently
         above the top edge: the first version of this rendered correctly and
         was impossible to see.

         A world of islands floating in open air has sky underneath it too, so
         stars below are not a cheat. */
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      positions[i * 3] = STAR_RADIUS * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = STAR_RADIUS * Math.cos(phi)
      positions[i * 3 + 2] = STAR_RADIUS * Math.sin(phi) * Math.sin(theta)
      // A few bright ones carry the field; most are faint. An evenly sized
      // starfield reads as noise rather than as a sky.
      sizes[i] = rand() < 0.08 ? 2.6 + rand() * 1.6 : 0.7 + rand() * 1.0
    }

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1))
    return geometry
  }, [count])
}

export default function NightSky({ quality }: { quality: QualitySettings }) {
  const { frame } = useExperience()
  const starsRef = useRef<Points>(null)
  const moonRef = useRef<Group>(null)
  const starMat = useRef<PointsMaterial>(null)
  const moonMat = useRef<MeshBasicMaterial>(null)
  const craterMat = useRef<MeshBasicMaterial>(null)

  const starCount = quality.tier === 'low' ? 260 : quality.tier === 'medium' ? 480 : 760
  const geometry = useStarGeometry(starCount)

  useFrame((state) => {
    const night = frame.current.nightPresence
    const visible = night > 0.01

    if (starsRef.current) starsRef.current.visible = visible
    if (moonRef.current) moonRef.current.visible = visible
    if (!visible) return

    const t = state.clock.elapsedTime
    if (starMat.current) {
      // A slow collective shimmer rather than per-star twinkling: cheaper, and
      // individually blinking stars look like a screensaver.
      starMat.current.opacity = night * (0.85 + Math.sin(t * 0.35) * 0.07)
    }
    if (moonMat.current) moonMat.current.opacity = night
    if (craterMat.current) craterMat.current.opacity = night * 0.55
  })

  return (
    <group>
      <points ref={starsRef} geometry={geometry} frustumCulled={false} renderOrder={-900}>
        <pointsMaterial
          ref={starMat}
          color="#DDE9FF"
          size={1.9}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          fog={false}
        />
      </points>

      <group ref={moonRef} position={MOON_POSITION} renderOrder={-880}>
        <mesh>
          <icosahedronGeometry args={[8.5, 2]} />
          <meshBasicMaterial
            ref={moonMat}
            color="#F2F5FF"
            transparent
            opacity={0}
            fog={false}
            toneMapped={false}
          />
        </mesh>
        {/* Two shallow craters, offset toward the terminator so the moon has an
            up direction and does not read as a plain white circle. */}
        <mesh position={[-2.4, 1.8, 8.0]}>
          <circleGeometry args={[2.1, 9]} />
          <meshBasicMaterial
            ref={craterMat}
            color="#C3CEE8"
            transparent
            opacity={0}
            fog={false}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[2.9, -2.2, 7.7]}>
          <circleGeometry args={[1.3, 8]} />
          <meshBasicMaterial
            color="#C3CEE8"
            transparent
            opacity={0.42}
            fog={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  )
}
