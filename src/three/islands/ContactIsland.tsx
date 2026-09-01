/* ============================================================================
   JOURNAL - the writing island.
   ----------------------------------------------------------------------------
   A desk under a tree with the work of writing spread over it: paper, a lamp,
   a mug, a stack of notebooks, and one person actually sitting at it.

   The doorway that used to stand here is gone. It was a leftover from when
   this island was about community, it did not mean anything once the island
   became the journal, and a two-metre door frame standing in a field was the
   single oddest object in the scene.

   Scale is checked against the figure, not eyeballed. The previous desk was
   taller than the people standing next to it: a desk is about 0.75 of a
   metre, a seated person's eye line is about 1.2, a standing one 1.7. Those
   ratios are what the numbers below are built from.
   ========================================================================= */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, MeshStandardMaterial } from 'three'
import { Facet, Rock, Tier, Tree, Underside } from '../primitives/forms'
import type { QualitySettings } from '../../lib/quality'

export const GROUND = 0.45

const GRASS = '#82A86D'
const GRASS_LIT = '#9DBB84'
const SOIL = '#78654F'
const SOIL_DEEP = '#4F4436'
const WOOD = '#7C6248'
const WOOD_DARK = '#5B472F'
const PAPER = '#EFE7D4'
const BLUE = '#2F5D9E'
const WARM = '#FFCB7A'

/* Sized against a person: legs 0.72 + torso 0.58 + head 0.24 puts a standing
   figure at about 1.54, and the desk top at 0.75 lands just below the waist,
   which is where a desk goes. The previous version had the table taller than
   the people standing beside it. */
const DESK_HEIGHT = 0.75

function Person({
  position,
  shirt,
  offset,
  seated = false,
}: {
  position: [number, number, number]
  shirt: string
  offset: number
  seated?: boolean
}) {
  const body = useRef<Group>(null)

  useFrame((state) => {
    if (!body.current) return
    const t = state.clock.elapsedTime + offset
    if (seated) {
      // Leaning in and back over a page.
      body.current.rotation.x = 0.1 + Math.sin(t * 0.5) * 0.05
      body.current.position.y = Math.sin(t * 0.9) * 0.008
    } else {
      body.current.position.y = Math.sin(t * 1.1) * 0.014
      body.current.rotation.z = Math.sin(t * 1.1) * 0.02
      body.current.rotation.y = Math.sin(t * 0.23) * 0.5
    }
  })

  const legs = seated ? 0.44 : 0.72
  const torso = seated ? 0.46 : 0.58

  return (
    <group ref={body} position={position}>
      {/* Legs */}
      {[-0.09, 0.09].map((x) => (
        <mesh key={x} position={[x, legs / 2, 0]} castShadow>
          <boxGeometry args={[0.12, legs, 0.14]} />
          <Facet color="#3E4A5C" roughness={0.85} />
        </mesh>
      ))}
      {/* Torso */}
      <mesh position={[0, legs + torso / 2, 0]} castShadow>
        <boxGeometry args={[0.34, torso, 0.22]} />
        <Facet color={shirt} roughness={0.8} />
      </mesh>
      {/* Head, landing near PERSON_HEIGHT when standing. */}
      <mesh position={[0, legs + torso + 0.16, 0]} castShadow>
        <boxGeometry args={[0.21, 0.24, 0.21]} />
        <Facet color="#C9A183" roughness={0.85} />
      </mesh>
    </group>
  )
}

/** The desk, at desk height, with the work spread over it. */
function WritingDesk({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const lamp = useRef<MeshStandardMaterial>(null)
  const page = useRef<Group>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (lamp.current) lamp.current.emissiveIntensity = 1.6 + Math.sin(t * 1.7) * 0.14
    // The top page lifting in the wind and settling again.
    if (page.current) page.current.rotation.x = -Math.PI / 2 + Math.max(0, Math.sin(t * 0.6)) * 0.22
  })

  const top = DESK_HEIGHT

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Top */}
      <mesh position={[0, top, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.55, 0.07, 0.78]} />
        <Facet color={WOOD} roughness={0.88} />
      </mesh>
      {/* Legs */}
      {[[-0.68, 0.3], [0.68, 0.3], [-0.68, -0.3], [0.68, -0.3]].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, top / 2, z]} castShadow>
          <boxGeometry args={[0.08, top, 0.08]} />
          <Facet color={WOOD_DARK} roughness={0.9} />
        </mesh>
      ))}

      {/* Loose paper */}
      <group ref={page} position={[-0.28, top + 0.045, 0.06]} rotation={[-Math.PI / 2, 0, 0.12]}>
        <mesh castShadow>
          <planeGeometry args={[0.3, 0.4]} />
          <meshStandardMaterial color={PAPER} flatShading side={2} roughness={0.95} />
        </mesh>
      </group>
      <mesh position={[-0.3, top + 0.04, 0.02]} rotation={[-Math.PI / 2, 0, -0.06]} receiveShadow>
        <planeGeometry args={[0.32, 0.42]} />
        <meshStandardMaterial color={PAPER} flatShading side={2} roughness={0.95} />
      </mesh>

      {/* Notebooks */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.42, top + 0.045 + i * 0.05, -0.16]} rotation={[0, i * 0.13, 0]} castShadow>
          <boxGeometry args={[0.34, 0.05, 0.25]} />
          <Facet color={[BLUE, '#B4553F', '#4E7A56'][i]} roughness={0.8} />
        </mesh>
      ))}

      {/* Mug */}
      <mesh position={[0.14, top + 0.08, 0.26]} castShadow>
        <cylinderGeometry args={[0.06, 0.055, 0.11, 8]} />
        <Facet color="#E4DCC8" roughness={0.7} />
      </mesh>

      {/* Desk lamp, the warm point of the island at night */}
      <group position={[0.62, top, 0.2]}>
        <mesh position={[0, 0.02, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.1, 0.04, 8]} />
          <Facet color={WOOD_DARK} roughness={0.7} />
        </mesh>
        <mesh position={[-0.04, 0.22, 0]} rotation={[0, 0, 0.24]} castShadow>
          <cylinderGeometry args={[0.017, 0.017, 0.42, 5]} />
          <Facet color="#5A6270" metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[-0.12, 0.42, 0]} rotation={[0, 0, 0.7]} castShadow>
          <coneGeometry args={[0.11, 0.16, 8]} />
          <Facet color={BLUE} roughness={0.6} />
        </mesh>
        <mesh position={[-0.14, 0.36, 0]}>
          <sphereGeometry args={[0.05, 7, 5]} />
          <meshStandardMaterial ref={lamp} color={WARM} emissive={WARM} emissiveIntensity={1.6} flatShading />
        </mesh>
      </group>
    </group>
  )
}

function Stool({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.21, 0.06, 9]} />
        <Facet color={WOOD} roughness={0.88} />
      </mesh>
      {[0, 2.1, 4.2].map((a) => (
        <mesh
          key={a}
          position={[Math.cos(a) * 0.13, 0.21, Math.sin(a) * 0.13]}
          rotation={[Math.cos(a) * 0.12, 0, -Math.sin(a) * 0.12]}
          castShadow
        >
          <cylinderGeometry args={[0.025, 0.03, 0.44, 5]} />
          <Facet color={WOOD_DARK} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

export default function ContactIsland({ quality }: { quality: QualitySettings }) {
  const d = quality.detail
  return (
    <group>
      <Tier radiusTop={2.7} radiusBottom={2.92} height={0.46} y={0} sides={9} color={SOIL} detail={d} />
      <Tier radiusTop={2.5} radiusBottom={2.66} height={0.22} y={0.34} sides={9} color={GRASS} detail={d} rotation={0.22} />
      <group position={[1.75, 0, -0.55]}>
        <Tier radiusTop={1.0} radiusBottom={1.12} height={0.34} y={0} sides={7} color={SOIL} detail={d} />
        <Tier radiusTop={0.9} radiusBottom={0.98} height={0.17} y={0.24} sides={7} color={GRASS_LIT} detail={d} />
      </group>
      <Underside radius={2.82} height={1.85} y={-1.12} sides={9} color={SOIL_DEEP} detail={d} rotation={0.15} />

      <WritingDesk position={[-0.15, GROUND, 0.35]} rotation={-0.22} />
      <Stool position={[-0.35, GROUND, -0.55]} />
      <Person position={[-0.32, GROUND + 0.28, -0.5]} shirt={BLUE} offset={0} seated />

      {/* One other person, standing, reading over the far side. */}
      <Person position={[1.15, GROUND, 0.9]} shirt="#577E5D" offset={3.1} />

      {/* A crate of paper by the tree. */}
      <group position={[-1.75, GROUND, 1.1]} rotation={[0, 0.4, 0]}>
        <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.32, 0.4]} />
          <Facet color={WOOD_DARK} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.35, 0]} rotation={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.4, 0.09, 0.3]} />
          <Facet color={PAPER} roughness={0.95} />
        </mesh>
      </group>

      <Tree position={[-1.55, GROUND, -1.25]} scale={0.95} trunk="#6B5037" canopy="#557A4B" detail={d} />
      <Tree position={[1.9, GROUND - 0.02, -0.5]} scale={0.6} trunk="#6B5037" canopy="#557A4B" detail={d} />
      <Rock position={[1.95, GROUND, 0.78]} rotation={[0.2, 0.9, 0.15]} scale={0.25} color={SOIL_DEEP} detail={d} />
      <Rock position={[-1.9, GROUND, -0.2]} rotation={[0.1, 1.6, 0.25]} scale={0.2} color={SOIL} detail={d} />
    </group>
  )
}
