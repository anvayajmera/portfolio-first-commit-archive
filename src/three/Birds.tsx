/* ============================================================================
   BIRDS - a few flocks crossing the sky.
   ----------------------------------------------------------------------------
   The sky was the emptiest part of the frame: correct colour, correct clouds,
   and nothing alive in it. Birds fix that for almost nothing. Each one is two
   triangles sharing a vertex, flapping by rotating the wings around the body
   axis, which is the whole illusion at this distance.

   They are instanced into one draw call per flock and they never come close
   enough for the crude geometry to matter. They also give the parallax
   something to act on in the upper half of the frame, where there is otherwise
   no depth cue at all.

   Night hides them. Birds silhouetted against a starfield would read as bats,
   and there is a moon up there doing that job better.
   ========================================================================= */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Object3D,
  type InstancedMesh,
  type MeshBasicMaterial,
} from 'three'
import { useExperience } from '../lib/experience'
import type { QualitySettings } from '../lib/quality'

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** One bird: a shallow V, origin at the body. */
function birdGeometry(): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute(
    'position',
    new Float32BufferAttribute(
      [
        0, 0, 0, -1, 0.34, -0.22, -0.86, 0.06, 0.3,
        0, 0, 0, 1, 0.34, -0.22, 0.86, 0.06, 0.3,
      ],
      3,
    ),
  )
  g.computeVertexNormals()
  return g
}

interface FlockSpec {
  count: number
  origin: [number, number, number]
  /** World units per second along +x. */
  speed: number
  spread: number
  scale: number
  /** Wingbeats per second. */
  beat: number
  span: number
}

export default function Birds({ quality }: { quality: QualitySettings }) {
  const { frame } = useExperience()
  const geometry = useMemo(birdGeometry, [])

  const flocks = useMemo<FlockSpec[]>(() => {
    /* Small and far. The first pass used scales around 1.0 at thirty units out,
       which put paper-dart sized birds across the top of the frame. A bird
       should be a mark a few pixels across that you notice because it moves,
       not a shape you can identify. */
    const all: FlockSpec[] = [
      { count: 7, origin: [-30, 13, -26], speed: 2.4, spread: 8, scale: 0.30, beat: 3.1, span: 70 },
      { count: 5, origin: [10, 20, -44], speed: 1.7, spread: 11, scale: 0.46, beat: 2.3, span: 92 },
      { count: 9, origin: [-8, 7, -18], speed: 3.0, spread: 6, scale: 0.22, beat: 3.8, span: 62 },
    ]
    if (quality.tier === 'low') return all.slice(0, 1)
    if (quality.tier === 'medium') return all.slice(0, 2)
    return all
  }, [quality.tier])

  return (
    <group>
      {flocks.map((flock, i) => (
        <Flock key={i} spec={flock} seed={4211 + i * 733} geometry={geometry} frame={frame} />
      ))}
    </group>
  )
}

function Flock({
  spec,
  seed,
  geometry,
  frame,
}: {
  spec: FlockSpec
  seed: number
  geometry: BufferGeometry
  frame: React.RefObject<{ cloudPresence: number; nightPresence: number }>
}) {
  const meshRef = useRef<InstancedMesh>(null)
  const matRef = useRef<MeshBasicMaterial>(null)
  const dummy = useMemo(() => new Object3D(), [])

  const birds = useMemo(() => {
    const rand = mulberry32(seed)
    return Array.from({ length: spec.count }, () => ({
      // Offsets inside the flock, so it holds a loose formation rather than
      // every bird sitting on one line.
      dx: (rand() * 2 - 1) * spec.spread,
      dy: (rand() * 2 - 1) * spec.spread * 0.35,
      dz: (rand() * 2 - 1) * spec.spread * 0.7,
      phase: rand() * Math.PI * 2,
      size: 0.75 + rand() * 0.5,
    }))
  }, [spec, seed])

  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh) return

    const night = frame.current.nightPresence
    const visible = night < 0.85 && frame.current.cloudPresence > 0.02
    mesh.visible = visible
    if (matRef.current) matRef.current.opacity = (1 - night) * frame.current.cloudPresence * 0.72
    if (!visible) return

    const t = state.clock.elapsedTime
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i]
      const span2 = spec.span * 2
      const x =
        (((spec.origin[0] + b.dx + t * spec.speed + spec.span) % span2) + span2) % span2 - spec.span

      dummy.position.set(
        x,
        spec.origin[1] + b.dy + Math.sin(t * 0.4 + b.phase) * 0.8,
        spec.origin[2] + b.dz,
      )
      // Flap by rolling the whole bird: at this size the wings and the body
      // are the same three triangles, and the eye reads the roll as a beat.
      dummy.rotation.set(0, 0, Math.sin(t * spec.beat + b.phase) * 0.55)
      dummy.scale.setScalar(spec.scale * b.size)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, birds.length]} frustumCulled={false}>
      <meshBasicMaterial
        ref={matRef}
        color="#43566E"
        transparent
        opacity={0}
        side={DoubleSide}
        depthWrite={false}
        fog={false}
      />
    </instancedMesh>
  )
}
