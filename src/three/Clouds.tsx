/* ============================================================================
   CLOUDS — layered alpha billboards at four depths.
   ----------------------------------------------------------------------------
   TECHNIQUE CHOICE (spec §2 asks for the reasoning).

   The alternative was a noise-based volumetric approximation: raymarch a few
   samples of 3D noise per fragment in a big screen-space pass. It looks
   fantastic and it is the wrong call here. Its cost scales with screen
   coverage times samples per fragment, and clouds want to cover most of the
   frame — on the 2021 mid-range phone in the perf budget that is the single
   biggest thing that could push us under 50fps, and it is a cost you pay every
   frame whether or not anyone is looking at the sky.

   Billboards are ~35 transparent quads sharing one 256px texture and one
   material. Overdraw is the only real cost, they cull properly, and because
   they are genuinely at different depths in the world, the parallax is real
   rather than simulated: they separate correctly under the sky-view drift and
   during every camera flight, for free.

   The texture is generated procedurally into a canvas at startup — no network
   request, no binary asset in the repo, and the shape is tunable in code.

   Each layer drifts at its own speed and wraps around; far layers move slower,
   which is the whole point of the exercise.
   ========================================================================= */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  CanvasTexture,
  Color,
  InstancedMesh,
  LinearFilter,
  MeshBasicMaterial,
  NormalBlending,
  Object3D,
  PlaneGeometry,
} from 'three'
import { useExperience } from '../lib/experience'
import { useReducedMotion } from '../lib/motion'
import type { QualitySettings } from '../lib/quality'

/** Deterministic PRNG so the sky composition is identical on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * A soft puff built from overlapping radial gradients. One blob would read as
 * a fuzzy dot; stacking several offset lobes with a flat-ish bottom gives the
 * cumulus silhouette that says "cloud" at a glance.
 */
function makeCloudTexture(): CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const lobes: [number, number, number][] = [
    [0.5, 0.56, 0.30],
    [0.32, 0.60, 0.22],
    [0.68, 0.60, 0.23],
    [0.42, 0.46, 0.20],
    [0.60, 0.47, 0.19],
    [0.5, 0.66, 0.24],
  ]

  ctx.globalCompositeOperation = 'lighter'
  for (const [cx, cy, r] of lobes) {
    const g = ctx.createRadialGradient(cx * size, cy * size, 0, cx * size, cy * size, r * size)
    g.addColorStop(0.0, 'rgba(255,255,255,0.95)')
    g.addColorStop(0.38, 'rgba(255,255,255,0.72)')
    g.addColorStop(0.72, 'rgba(255,255,255,0.22)')
    g.addColorStop(1.0, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(cx * size, cy * size, r * size, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.generateMipmaps = false
  return texture
}

interface LayerSpec {
  z: number
  count: number
  scale: [min: number, max: number]
  speed: number
  opacity: number
  tint: Color
  yRange: [min: number, max: number]
  /** Half-width of the wrap-around band. */
  span: number
}

export default function Clouds({ quality }: { quality: QualitySettings }) {
  const { frame } = useExperience()
  const reduced = useReducedMotion()
  const camera = useThree((s) => s.camera)
  const texture = useMemo(makeCloudTexture, [])

  useEffect(() => () => texture.dispose(), [texture])

  const layers = useMemo<LayerSpec[]>(() => {
    const lit = new Color('#FFFFFF')
    const shade = new Color('#DCEFF9')
    /* Near layers are warmer and faster; far layers cooler, slower, and more
       transparent so they sink into the fog. Four is the full set — lower
       tiers drop from the front, because the near layers are the ones that
       cost fill rate. */
    /* Six layers, wrapping the camera rather than sitting only behind it. The
       first pass put every cloud at negative z, which from a high camera left
       the top two thirds of the frame as flat empty blue: the sky read as a
       painted wall rather than as air the islands are floating in.

       Layers now sit in front of, level with, and far behind the islands, with
       the near ones bright and fast and the far ones pale and slow. That range
       of speeds is what makes the depth legible when the camera moves. */
    /* Depth bands, all of them BEHIND or level with the islands (which sit
       between z = 2 and z = -10). An earlier pass put a layer at z = 26, three
       units in front of the camera, and it filled the lens with pale haze.

       Only the two NEAREST bands are lifted above the island tops, because a
       cloud drifting between the camera and an island washes it out entirely at
       this opacity. The far bands sit level with and below the islands, where
       they cannot occlude anything and they fill what was otherwise a wall of
       flat blue behind and beneath the world. */
    const all: LayerSpec[] = [
      { z: 10, count: 9, scale: [5, 10], speed: 0.40, opacity: 0.46, tint: lit.clone(), yRange: [16, 34], span: 62 },
      { z: -6, count: 12, scale: [7, 13], speed: 0.31, opacity: 0.54, tint: lit.clone(), yRange: [12, 30], span: 72 },
      { z: -22, count: 16, scale: [9, 18], speed: 0.26, opacity: 0.62, tint: lit.clone(), yRange: [-8, 24], span: 88 },
      { z: -40, count: 18, scale: [12, 24], speed: 0.18, opacity: 0.58, tint: lit.clone().lerp(shade, 0.3), yRange: [-18, 22], span: 108 },
      { z: -62, count: 18, scale: [18, 34], speed: 0.11, opacity: 0.50, tint: shade.clone().lerp(lit, 0.45), yRange: [-26, 20], span: 140 },
      { z: -92, count: 16, scale: [28, 52], speed: 0.06, opacity: 0.38, tint: shade.clone(), yRange: [-36, 18], span: 180 },
    ]
    /* Lower tiers drop layers from the NEAR end: those are the ones that cost
       fill rate, being closest to the camera and therefore largest on screen.
       Keeping the far ones preserves the sense of depth for almost nothing. */
    return all
      .slice(all.length - quality.cloudLayers)
      .map((l) => ({ ...l, count: Math.min(l.count, quality.cloudsPerLayer) }))
  }, [quality.cloudLayers, quality.cloudsPerLayer])

  return (
    <group>
      {layers.map((layer, i) => (
        <CloudLayer
          key={layer.z}
          layer={layer}
          seed={1337 + i * 977}
          texture={texture}
          frame={frame}
          camera={camera}
          still={reduced}
        />
      ))}
    </group>
  )
}

function CloudLayer({
  layer,
  seed,
  texture,
  frame,
  camera,
  still,
}: {
  layer: LayerSpec
  seed: number
  texture: CanvasTexture
  frame: React.RefObject<{ cloudPresence: number; nightPresence: number }>
  camera: { quaternion: { x: number; y: number; z: number; w: number } }
  still: boolean
}) {
  const meshRef = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])

  const instances = useMemo(() => {
    const rand = mulberry32(seed)
    return Array.from({ length: layer.count }, () => ({
      x: (rand() * 2 - 1) * layer.span,
      y: layer.yRange[0] + rand() * (layer.yRange[1] - layer.yRange[0]),
      zJitter: (rand() * 2 - 1) * 6,
      scale: layer.scale[0] + rand() * (layer.scale[1] - layer.scale[0]),
      /* Squash vertically — real clouds are wider than they are tall, and an
         un-squashed square puff reads as a smudge. */
      squash: 0.42 + rand() * 0.2,
      phase: rand() * Math.PI * 2,
    }))
  }, [layer, seed])

  const geometry = useMemo(() => new PlaneGeometry(1, 1), [])
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        // Normal blending, not additive: additive clouds glow like plasma
        // against a dark sky and never read as opaque mass. The lit edge comes
        // from the tint colour instead.
        blending: NormalBlending,
        toneMapped: true,
        /* Fog off. Distance fog is physically right and here it was erasing
           the thing it was applied to: the far bands sit 90 to 130 units out,
           well past the fog far plane, so they were being blended entirely
           into the sky colour and the lower two thirds of the frame stayed a
           flat wall of blue. Depth is carried by the per-layer tint and
           opacity instead, which is under art direction rather than under a
           distance curve tuned for the islands. */
        fog: false,
      }),
    [texture],
  )

  /* Night tint. Sunlit white cloud against a midnight sky reads as an
     overcast storm front, not as night: at night a cloud is a dark shape that
     occludes stars, with only a thin moonlit edge. Lerping the layer tint down
     toward deep blue and dropping the opacity gets that without a second set
     of layers. */
  const nightTint = useMemo(() => new Color('#1B2A47'), [])
  const tintScratch = useMemo(() => new Color(), [])

  useEffect(() => {
    material.color.copy(layer.tint)
    return () => {
      material.dispose()
      geometry.dispose()
    }
  }, [material, geometry, layer.tint])

  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh) return

    // Reduced motion: the sky still exists, it just stops moving.
    const t = still ? 0 : state.clock.elapsedTime
    const night = frame.current.nightPresence
    tintScratch.copy(layer.tint).lerp(nightTint, night * 0.88)
    material.color.copy(tintScratch)
    material.opacity = layer.opacity * frame.current.cloudPresence * (1 - night * 0.35)

    for (let i = 0; i < instances.length; i++) {
      const c = instances[i]
      // Drift and wrap. Modulo on the full band width means a cloud leaving
      // the right edge re-enters on the left at the same height, so the sky
      // never empties out.
      const span2 = layer.span * 2
      const x = (((c.x + t * layer.speed + layer.span) % span2) + span2) % span2 - layer.span
      dummy.position.set(x, c.y + Math.sin(t * 0.08 + c.phase) * 0.35, layer.z + c.zJitter)
      dummy.scale.set(c.scale, c.scale * c.squash, 1)
      // Billboard: copy the camera's orientation so every puff faces the lens.
      dummy.quaternion.set(
        camera.quaternion.x,
        camera.quaternion.y,
        camera.quaternion.z,
        camera.quaternion.w,
      )
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, instances.length]}
      frustumCulled={false}
      renderOrder={-500}
    />
  )
}
