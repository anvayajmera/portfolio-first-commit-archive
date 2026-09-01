import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { Facet, Mast, Rock, Tier, Underside } from '../primitives/forms'
import type { QualitySettings } from '../../lib/quality'

const GROUND = '#6F9665'
const GROUND_LIT = '#88A978'
const SOIL = '#5E5547'
const SOIL_DEEP = '#3F403A'
const STEEL = '#82909A'
const DARK = '#263744'
const TEAL = '#137C8B'
const GOLD = '#D29A3D'

function RescueRobot({ position }: { position: [number, number, number] }) {
  const body = useRef<Group>(null)

  useFrame((state) => {
    if (!body.current) return
    const t = state.clock.elapsedTime * 0.34
    /* A short there-and-back run rather than a loop. A machine shuttling over
       the same metre of ground reads as something being tested, which is what
       this island is about; a machine driving in circles reads as decoration. */
    const travel = Math.sin(t) * 0.55
    body.current.position.z = travel
    body.current.rotation.y = 0.35 + Math.cos(t) * 0.18
  })

  return (
    <group ref={body} position={position} rotation={[0, 0.35, 0]}>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.95, 0.55, 0.76]} />
        <Facet color={DARK} roughness={0.55} />
      </mesh>
      {[-0.52, 0.52].flatMap((x) => [-0.28, 0.28].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.24, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.15, 9]} />
          <Facet color="#1D252B" roughness={0.8} />
        </mesh>
      )))}
      <mesh position={[0, 0.85, 0.18]} castShadow>
        <boxGeometry args={[0.48, 0.28, 0.3]} />
        <Facet color="#6EAD52" roughness={0.55} />
      </mesh>
      {[-0.15, 0.15].map((x) => (
        <mesh key={x} position={[x, 0.91, 0.36]} castShadow>
          <sphereGeometry args={[0.055, 7, 5]} />
          <Facet color="#80D7E0" emissive="#80D7E0" emissiveIntensity={0.3} />
        </mesh>
      ))}
    </group>
  )
}

function Submarine({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0.08, -0.55, -Math.PI / 2]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.28, 1.05, 4, 9]} />
        <Facet color="#D28B3F" roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.15, -0.32]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.08, 0.52, 0.34]} />
        <Facet color={DARK} />
      </mesh>
      <mesh position={[0, -0.72, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.08, 6]} />
        <Facet color={STEEL} metalness={0.25} roughness={0.45} />
      </mesh>
    </group>
  )
}

function RobotArm({ position }: { position: [number, number, number] }) {
  const shoulder = useRef<Group>(null)
  const elbow = useRef<Group>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.28
    // Rotate in the XY plane. The old X-axis motion pushed each link into the
    // screen, foreshortening it until the joints looked disconnected.
    if (shoulder.current) shoulder.current.rotation.z = -0.36 + Math.sin(t) * 0.2
    if (elbow.current) elbow.current.rotation.z = 0.72 + Math.sin(t * 1.4 + 0.9) * 0.24
  })

  return (
    <group position={position} rotation={[0, 0.04, 0]} scale={1.12}>
      {/* Base, bolted down. */}
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.48, 0.24, 7]} />
        <Facet color={DARK} roughness={0.55} />
      </mesh>

      <mesh position={[0, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.3, 8]} />
        <Facet color={GOLD} metalness={0.18} roughness={0.45} />
      </mesh>

      {/* Side-on articulated chain. Each link begins at its parent joint and
          the hinge discs make the mechanical relationship unambiguous. */}
      <group ref={shoulder} position={[0, 0.24, 0]}>
        <mesh position={[0, 0.42, 0]} castShadow>
          <boxGeometry args={[0.23, 0.84, 0.18]} />
          <Facet color={TEAL} metalness={0.12} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.84, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.28, 8]} />
          <Facet color={STEEL} metalness={0.25} roughness={0.45} />
        </mesh>

        <group ref={elbow} position={[0, 0.84, 0]}>
          <mesh position={[0, 0.32, 0]} castShadow>
            <boxGeometry args={[0.19, 0.64, 0.16]} />
            <Facet color={STEEL} metalness={0.2} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.67, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.13, 0.13, 0.24, 8]} />
            <Facet color={GOLD} />
          </mesh>
          <mesh position={[0, 0.82, 0]} castShadow>
            <boxGeometry args={[0.34, 0.14, 0.2]} />
            <Facet color={DARK} roughness={0.5} />
          </mesh>
          {[-0.13, 0.13].map((x) => (
            <mesh key={x} position={[x, 0.98, 0]} castShadow>
              <boxGeometry args={[0.07, 0.32, 0.08]} />
              <Facet color={GOLD} metalness={0.1} roughness={0.5} />
            </mesh>
          ))}
        </group>
      </group>

      {/* Stock waiting to be picked up. */}
      {[-0.65, 0, 0.65].map((x) => (
        <mesh key={x} position={[x, 0.22, 0.72]} castShadow receiveShadow>
          <cylinderGeometry args={[0.11, 0.16, 0.55, 7]} />
          <Facet color="#E8E2D4" />
        </mesh>
      ))}
    </group>
  )
}

function Drone({ position }: { position: [number, number, number] }) {
  const hull = useRef<Group>(null)
  const rotors = useRef<(Group | null)[]>([])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (hull.current) {
      // A slow orbit with a little altitude wander, banking into the turn the
      // way an aircraft has to. A drone flying dead level in a circle looks
      // like it is on a wire.
      const a = t * 0.34
      hull.current.position.x = Math.cos(a) * 1.15
      hull.current.position.z = Math.sin(a) * 1.15
      hull.current.position.y = Math.sin(t * 0.7) * 0.14
      hull.current.rotation.y = -a
      hull.current.rotation.z = 0.16
    }
    /* Each rotor spins about ITS OWN axis. Rotating one parent group holding
       all four made them orbit the drone's centre instead, which is exactly
       what "the circles are not attached to the frame" looks like.
       Counter-rotating pairs, as on a real quad. */
    rotors.current.forEach((rotor, i) => {
      if (rotor) rotor.rotation.y = t * 9 * (i % 2 === 0 ? 1 : -1)
    })
  })

  return (
    <group position={position}>
      <group ref={hull}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.14, 0.42]} />
          <Facet color={DARK} />
        </mesh>
        <mesh rotation={[0, Math.PI / 4, 0]} castShadow>
          <boxGeometry args={[1.25, 0.05, 0.12]} />
          <Facet color={STEEL} metalness={0.2} roughness={0.5} />
        </mesh>
        <mesh rotation={[0, -Math.PI / 4, 0]} castShadow>
          <boxGeometry args={[1.25, 0.05, 0.12]} />
          <Facet color={STEEL} metalness={0.2} roughness={0.5} />
        </mesh>
        {[[0.47, 0.47], [-0.47, 0.47], [0.47, -0.47], [-0.47, -0.47]].map(([x, z], i) => (
          <group
            key={`${x}-${z}`}
            ref={(node) => {
              rotors.current[i] = node
            }}
            position={[x, 0.08, z]}
          >
            {/* Two blades rather than a disc: a spinning disc looks identical
                stationary, and the whole point is that it is turning. */}
            <mesh castShadow>
              <boxGeometry args={[0.5, 0.02, 0.07]} />
              <Facet color={TEAL} roughness={0.5} />
            </mesh>
            <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
              <boxGeometry args={[0.5, 0.02, 0.07]} />
              <Facet color={TEAL} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.05, 6]} />
              <Facet color={STEEL} metalness={0.3} roughness={0.45} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

export default function ProjectsIsland({ quality }: { quality: QualitySettings }) {
  const d = quality.detail
  return (
    <group>
      <Tier radiusTop={3.7} radiusBottom={3.95} height={0.5} y={0} sides={11} color={SOIL} detail={d} />
      <Tier radiusTop={3.48} radiusBottom={3.66} height={0.24} y={0.37} sides={11} color={GROUND} detail={d} rotation={0.2} />
      <group position={[2.75, -0.02, -1.0]}>
        <Tier radiusTop={1.55} radiusBottom={1.72} height={0.42} y={0} sides={7} color={SOIL} detail={d} />
        <Tier radiusTop={1.4} radiusBottom={1.53} height={0.2} y={0.3} sides={7} color={GROUND_LIT} detail={d} />
      </group>
      <Underside radius={3.82} height={2.2} y={-1.32} sides={11} color={SOIL_DEEP} detail={d} rotation={0.18} />

      <RescueRobot position={[-1.65, 0.5, 0.55]} />
      {/* Submarine, in a cradle rather than resting on thin air. */}
      <group position={[1.65, 0.49, 1.35]}>
        {[-0.5, 0.5].map((z) => (
          <mesh key={z} position={[0, 0.11, z]} castShadow receiveShadow>
            <boxGeometry args={[0.7, 0.22, 0.14]} />
            <Facet color="#6A5A48" roughness={0.88} />
          </mesh>
        ))}
        <Submarine position={[0, 0.36, 0]} />
      </group>
      <RobotArm position={[1.45, 0.48, -1.3]} />
      <Drone position={[-0.3, 2.15, -1.4]} />
      <Mast position={[-2.35, 0.48, -1.25]} color={STEEL} accent={TEAL} detail={d} />

      <group position={[-0.25, 0.48, 1.6]} rotation={[0, 0.3, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.12, 0.65]} />
          <Facet color="#D0B987" roughness={0.7} />
        </mesh>
        {[-0.58, 0.58].map((x) => (
          <mesh key={x} position={[x, -0.25, 0]} castShadow>
            <boxGeometry args={[0.1, 0.45, 0.5]} />
            <Facet color={DARK} />
          </mesh>
        ))}
        <mesh position={[0.22, 0.14, 0]} castShadow>
          <boxGeometry args={[0.42, 0.16, 0.32]} />
          <Facet color={TEAL} />
        </mesh>
      </group>

      <Rock position={[2.85, 0.42, 0.25]} rotation={[0.2, 0.8, 0.2]} scale={0.3} color={SOIL_DEEP} detail={d} />
      <Rock position={[-2.8, 0.42, 1.45]} rotation={[0.1, 1.8, 0.3]} scale={0.25} color={SOIL} detail={d} />
    </group>
  )
}
