/* ============================================================================
   ABOUT - the personal island.
   ----------------------------------------------------------------------------
   This is "who I am", so it holds the things that are true away from a bench:
   a mountain bike leaning on its stand, a camera on a tripod, an FPV quad on a
   launch pad, and somewhere to sit. The detectors and the balloon moved to
   Projects, where the work they belong to now lives.

   Two rules everything follows, because breaking either is what made the first
   version look wrong:

   1. GROUND is a single constant and every object's BASE sits on it. Props
      that carry their own guess at the surface height end up half-buried or
      hovering, and nothing reads as fake faster.

   2. Anything that would move in life, moves. A scene of perfectly still
      objects reads as a screenshot.
   ========================================================================= */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, MeshStandardMaterial } from 'three'
import { Facet, Rock, Tier, Tree, Underside } from '../primitives/forms'
import type { QualitySettings } from '../../lib/quality'

/** Top of the grass. Every base sits here. */
export const GROUND = 0.46

const GRASS = '#7FA66A'
const GRASS_LIT = '#9BBB7E'
const SOIL = '#79634E'
const SOIL_DEEP = '#514536'
const FRAME = '#C4543F'
const RUBBER = '#23262B'
const METAL = '#C8CCD4'
const WOOD = '#7A6046'
const DARK = '#273847'
const LENS = '#5FA8C4'
const COPPER = '#C77745'
const SIGNAL = '#72C7D2'

/* --- the bike ---------------------------------------------------------------
   Built from the silhouette in, because that is all that survives at this
   scale: two wheels, a triangle between them, bars and a saddle. Detail below
   that reads as noise, so there is none.
   -------------------------------------------------------------------------- */

function BikeTube({
  from,
  to,
  radius = 0.035,
  color = FRAME,
  z = 0,
}: {
  from: [number, number]
  to: [number, number]
  radius?: number
  color?: string
  z?: number
}) {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const length = Math.hypot(dx, dy)
  const angle = Math.atan2(-dx, dy)
  return (
    <mesh position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, z]} rotation={[0, 0, angle]} castShadow>
      <cylinderGeometry args={[radius, radius, length, 6]} />
      <Facet color={color} metalness={0.28} roughness={0.42} />
    </mesh>
  )
}

function BikeWheel({ x, radius, segments }: { x: number; radius: number; segments: number }) {
  return (
    <group position={[x, radius, 0]}>
      <mesh castShadow>
        <torusGeometry args={[radius, 0.055, 7, segments]} />
        <Facet color={RUBBER} roughness={0.9} />
      </mesh>
      <mesh castShadow>
        <torusGeometry args={[radius - 0.07, 0.014, 5, segments]} />
        <Facet color={METAL} metalness={0.55} roughness={0.35} />
      </mesh>
      {Array.from({ length: 8 }, (_, index) => (
        <mesh key={index} rotation={[0, 0, (index * Math.PI) / 4]} castShadow>
          <boxGeometry args={[0.012, radius * 1.55, 0.012]} />
          <Facet color={METAL} metalness={0.5} roughness={0.38} />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.065, 0.12, 8]} />
        <Facet color={METAL} metalness={0.5} roughness={0.32} />
      </mesh>
    </group>
  )
}

function MountainBike({
  position,
  rotation = 0,
  detail = 1,
}: {
  position: [number, number, number]
  rotation?: number
  detail?: number
}) {
  const segments = detail > 0 ? 20 : 12
  const radius = 0.43
  const rear: [number, number] = [-0.62, radius]
  const front: [number, number] = [0.68, radius]
  const crank: [number, number] = [-0.08, 0.46]
  const seat: [number, number] = [-0.34, 1.06]
  const head: [number, number] = [0.38, 1.0]

  return (
    <group position={position} rotation={[0, rotation, 0]} scale={1.14}>
      <BikeWheel x={rear[0]} radius={radius} segments={segments} />
      <BikeWheel x={front[0]} radius={radius} segments={segments} />

      {/* Two complete triangles. Every tube terminates at a visible joint, so
          the frame reads as a bike instead of a handful of floating rods. */}
      <BikeTube from={rear} to={crank} radius={0.038} />
      <BikeTube from={rear} to={seat} radius={0.033} />
      <BikeTube from={crank} to={seat} radius={0.044} />
      <BikeTube from={crank} to={head} radius={0.052} />
      <BikeTube from={seat} to={head} radius={0.042} />
      <BikeTube from={head} to={front} radius={0.036} color={METAL} z={-0.035} />
      <BikeTube from={head} to={front} radius={0.036} color={METAL} z={0.035} />

      <mesh position={[crank[0], crank[1], 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.105, 0.105, 0.08, 9]} />
        <Facet color={METAL} metalness={0.55} roughness={0.32} />
      </mesh>
      <mesh position={[seat[0] - 0.02, seat[1] + 0.07, 0]} castShadow>
        <boxGeometry args={[0.3, 0.065, 0.16]} />
        <Facet color={DARK} roughness={0.68} />
      </mesh>
      <BikeTube from={head} to={[0.34, 1.2]} radius={0.025} color={METAL} />
      <mesh position={[0.34, 1.22, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.5, 6]} />
        <Facet color={DARK} roughness={0.62} />
      </mesh>

      {/* Side stand keeps the parked pose believable. */}
      <BikeTube from={crank} to={[-0.25, 0.03]} radius={0.018} color={DARK} z={-0.08} />
    </group>
  )
}

function CameraTripod({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle) => (
        <mesh
          key={angle}
          position={[Math.cos(angle) * 0.18, 0.46, Math.sin(angle) * 0.18]}
          rotation={[0, -angle, -0.34]}
          castShadow
        >
          <cylinderGeometry args={[0.022, 0.028, 0.96, 5]} />
          <Facet color={DARK} metalness={0.28} roughness={0.48} />
        </mesh>
      ))}
      <mesh position={[0, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.55, 6]} />
        <Facet color={METAL} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.28, 0]} castShadow>
        <boxGeometry args={[0.52, 0.34, 0.25]} />
        <Facet color={DARK} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.31, 0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.16, 0.28, 9]} />
        <Facet color={LENS} metalness={0.2} roughness={0.28} emissive={LENS} emissiveIntensity={0.16} />
      </mesh>
      <mesh position={[-0.12, 1.52, -0.03]} castShadow>
        <boxGeometry args={[0.18, 0.12, 0.14]} />
        <Facet color={DARK} roughness={0.6} />
      </mesh>
    </group>
  )
}

function PhotoBillboard({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.82, -0.04]} castShadow>
          <boxGeometry args={[0.09, 1.65, 0.09]} />
          <Facet color={WOOD} roughness={0.78} />
        </mesh>
      ))}
      <mesh position={[0, 1.3, 0]} castShadow>
        <boxGeometry args={[1.72, 1.34, 0.13]} />
        <Facet color={FRAME} roughness={0.62} />
      </mesh>
      <mesh position={[0, 1.3, 0.075]}>
        <planeGeometry args={[1.48, 1.1]} />
        <Facet color="#DDE8E8" roughness={0.92} />
      </mesh>
      {/* A neutral portrait marker for now. This face can be replaced with an
          actual image texture as soon as Anvay supplies the photo. */}
      <mesh position={[0, 1.52, 0.1]}>
        <circleGeometry args={[0.2, 10]} />
        <Facet color={DARK} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.12, 0.1]}>
        <circleGeometry args={[0.4, 12, 0, Math.PI]} />
        <Facet color={DARK} roughness={0.7} />
      </mesh>
    </group>
  )
}

/* --- the research bench, restored -------------------------------------------
   These were moved to Projects in an earlier pass and moved straight back:
   they belong on the island that is about the person, because they are what he
   actually does. About now holds both halves, the work and the life.
   -------------------------------------------------------------------------- */

function Detector({
  position,
  rotation = 0,
  offset,
}: {
  position: [number, number, number]
  rotation?: number
  offset: number
}) {
  const led = useRef<MeshStandardMaterial>(null)

  useFrame((state) => {
    if (!led.current) return
    // A counter ticking over, not a heartbeat: two quick pulses then a pause,
    // which reads as equipment doing something rather than merely being on.
    const t = (state.clock.elapsedTime * 0.9 + offset) % 3
    const lit = t < 0.18 || (t > 0.36 && t < 0.54)
    led.current.emissiveIntensity = lit ? 2.4 : 0.25
  })

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.16, 0.52]} />
        <Facet color={DARK} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.21, 0]} castShadow>
        <boxGeometry args={[0.58, 0.1, 0.42]} />
        <meshStandardMaterial
          ref={led}
          color={SIGNAL}
          emissive={SIGNAL}
          emissiveIntensity={0.25}
          roughness={0.48}
          flatShading
        />
      </mesh>
      <mesh position={[0, 0.31, 0]} castShadow>
        <boxGeometry args={[0.7, 0.1, 0.52]} />
        <Facet color={DARK} roughness={0.55} />
      </mesh>
      <mesh position={[0.28, 0.44, 0]} castShadow>
        <boxGeometry args={[0.11, 0.24, 0.3]} />
        <Facet color={COPPER} metalness={0.35} roughness={0.45} />
      </mesh>
    </group>
  )
}

function BalloonRig({ position }: { position: [number, number, number] }) {
  const envelope = useRef<Group>(null)
  const tether = useRef<import('three').Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const rise = Math.sin(t * 0.42) * 0.16
    if (envelope.current) {
      envelope.current.position.y = 1.62 + rise
      envelope.current.rotation.z = Math.sin(t * 0.31) * 0.09
      envelope.current.rotation.x = Math.cos(t * 0.27) * 0.06
    }
    if (tether.current) {
      const length = 1.02 + rise
      tether.current.scale.y = length / 1.02
      tether.current.position.y = 0.34 + length / 2
    }
  })

  return (
    <group position={position}>
      <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.66, 0.14, 0.66]} />
        <Facet color={DARK} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.4, 0.32, 0.34]} />
        <Facet color={COPPER} roughness={0.6} />
      </mesh>
      <mesh ref={tether} position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.016, 0.016, 1.02, 5]} />
        <Facet color={DARK} roughness={0.7} />
      </mesh>
      <group ref={envelope} position={[0, 1.62, 0]}>
        <mesh scale={[0.62, 0.78, 0.62]} castShadow>
          <sphereGeometry args={[0.55, 10, 7]} />
          <Facet color="#F3E5C6" roughness={0.82} />
        </mesh>
        <mesh position={[0, -0.42, 0]} castShadow>
          <coneGeometry args={[0.14, 0.22, 7]} />
          <Facet color="#E4D3AC" roughness={0.85} />
        </mesh>
      </group>
    </group>
  )
}

function SatelliteBench({ position }: { position: [number, number, number] }) {
  const panels = useRef<Group>(null)

  useFrame((state) => {
    if (!panels.current) return
    // Panels tracking a sun that is not there. Slow enough that you only
    // notice on the second look, which is the right amount.
    panels.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.16) * 0.42
  })

  return (
    <group position={position} rotation={[0, -0.35, 0]}>
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.12, 0.66]} />
        <Facet color="#6A5A48" roughness={0.85} />
      </mesh>
      {[-0.62, 0.62].map((x) => (
        <mesh key={x} position={[x, 0.02, 0]} castShadow>
          <boxGeometry args={[0.1, 0.1, 0.56]} />
          <Facet color="#55483A" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.56, 0.46, 0.48]} />
        <Facet color={METAL} metalness={0.2} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.34, 5]} />
        <Facet color={DARK} />
      </mesh>
      <mesh position={[0, 0.91, 0]} castShadow>
        <octahedronGeometry args={[0.09, 0]} />
        <Facet color={SIGNAL} roughness={0.4} emissive={SIGNAL} emissiveIntensity={0.9} />
      </mesh>
      <group ref={panels} position={[0, 0.4, 0]}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.34, 0, 0]}>
            <mesh position={[side * 0.42, 0, 0]} castShadow>
              <boxGeometry args={[0.78, 0.04, 0.44]} />
              <Facet color="#315B87" metalness={0.18} roughness={0.45} />
            </mesh>
            <mesh position={[side * 0.06, 0, 0]} castShadow>
              <boxGeometry args={[0.14, 0.05, 0.1]} />
              <Facet color={METAL} metalness={0.3} roughness={0.5} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

/* --- the island -------------------------------------------------------------- */

export default function PortfolioIsland({ quality }: { quality: QualitySettings }) {
  const d = quality.detail
  return (
    <group>
      {/* Back to the original dimensions. An earlier pass enlarged this island
          to fit a camera rig, an FPV pad and a bench alongside the research
          bench; those are gone again and the island does not need the room. */}
      <Tier radiusTop={3.45} radiusBottom={3.7} height={0.46} y={0} sides={11} color={SOIL} detail={d} />
      <Tier radiusTop={3.2} radiusBottom={3.38} height={0.24} y={0.34} sides={11} color={GRASS} detail={d} rotation={0.18} />
      <group position={[2.7, -0.02, -0.65]}>
        <Tier radiusTop={1.35} radiusBottom={1.5} height={0.38} y={0} sides={7} color={SOIL} detail={d} />
        <Tier radiusTop={1.22} radiusBottom={1.34} height={0.2} y={0.27} sides={7} color={GRASS_LIT} detail={d} />
      </group>
      <Underside radius={3.58} height={2.05} y={-1.22} sides={11} color={SOIL_DEEP} detail={d} rotation={0.12} />

      <PhotoBillboard position={[-1.75, GROUND, -1.12]} />

      {/* Detector bench: a real table the units stand on. */}
      <group position={[-1.15, GROUND, 0.25]}>
        <mesh position={[0.2, 0.05, 0.05]} castShadow receiveShadow>
          <boxGeometry args={[2.3, 0.1, 0.9]} />
          <Facet color="#6A5A48" roughness={0.88} />
        </mesh>
        <Detector position={[-0.55, 0.1, 0.42]} rotation={0.18} offset={0} />
        <Detector position={[0.25, 0.1, 0.1]} rotation={-0.12} offset={1.1} />
        <Detector position={[0.95, 0.1, -0.3]} rotation={0.22} offset={2.2} />
      </group>

      <BalloonRig position={[1.55, GROUND, -1.35]} />
      {/* Pulled left and forward so the television no longer hides it. */}
      <SatelliteBench position={[0.82, GROUND, 0.3]} />
      <CameraTripod position={[-0.25, GROUND, 2.25]} rotation={-0.08} />

      {/* Front edge, nearly side-on to the establishing camera. */}
      <MountainBike position={[-1.7, GROUND, 1.72]} rotation={0.06} detail={d} />

      <Tree position={[-2.72, GROUND, 0.45]} scale={0.82} trunk="#6A523B" canopy="#557A4B" detail={d} />
      <Tree position={[2.6, GROUND - 0.02, 0.4]} scale={0.62} trunk="#6A523B" canopy="#557A4B" detail={d} />
      <Rock position={[-2.85, GROUND, -0.3]} rotation={[0.2, 0.8, 0.2]} scale={0.34} color={SOIL_DEEP} detail={d} />
      <Rock position={[0.35, GROUND, 2.55]} rotation={[0.1, 1.7, 0.25]} scale={0.24} color={SOIL} detail={d} />
    </group>
  )
}
