/* ============================================================================
   ISLAND BASE — everything the three islands share (spec §4, §6).
   ----------------------------------------------------------------------------
   Idle motion, hover, click-confirm, materialise-on-reveal and the accent rim.
   Each island component supplies only its geometry.

   IDLE. Bob and sway run on the island's own period and phase from the
   manifest, and the periods are mutually incommensurate (7.3 / 5.9 / 9.7s), so
   the three never drift into sync. Synchronised idle motion is the single
   clearest tell that a scene was generated rather than composed.

   TOUCH. There is no hover on touch, so tap goes straight in — no
   hover-then-click dead end (§10). The confirm pulse fires immediately and the
   flight starts a beat later, so the tap feels registered before the camera
   has begun to move (§6).
   ========================================================================= */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import gsap from 'gsap'
import type { Group } from 'three'
import { useExperience } from '../../lib/experience'
import type { IslandDef } from '../../lib/islands'
import { damp, useReducedMotion } from '../../lib/motion'
import Television from '../primitives/Television'

/** Delay between the confirm pulse and the flight starting. */
const CONFIRM_DELAY = 0.12

export default function IslandBase({
  island,
  children,
}: {
  island: IslandDef
  children: ReactNode
}) {
  const { frame, phase, enterIsland, hoveredIsland, setHoveredIsland, activeIsland, flightIsland } =
    useExperience()
  const reduced = useReducedMotion()
  const groupRef = useRef<Group>(null)
  const innerRef = useRef<Group>(null)
  const [pressed, setPressed] = useState(false)
  const pulse = useRef({ value: 0 })
  /* Hover scale is tracked here rather than read back off the mesh. Reading
     inner.scale.x and then writing `island.scale * eased * damped` into it
     feeds the output back in as the next frame's input: the fixed point is
     damped = island.scale * damped, which has no solution for island.scale > 1,
     so the value runs away and the islands grow until the camera is inside
     them. That is the "islands not visible at all" bug. Keep animation state
     out of the transform you are writing to. */
  const hoverScale = useRef(1)
  /* Plain refs handed to the television's shader so it can read the night
     crossfade and whether this island is the one being visited, without either
     value going through React. */
  const nightRef = useRef(0)
  const activeRef = useRef(0)
  const confirmCall = useRef<gsap.core.Tween | null>(null)

  useEffect(
    () => () => {
      confirmCall.current?.kill()
    },
    [],
  )

  const interactive = phase === 'sky'
  const hovered = hoveredIsland === island.id && interactive
  const isFocus = activeIsland === island.id || flightIsland === island.id

  /* Cursor. Only while actually clickable, or the pointer stays a hand after
     the camera has flown somewhere else. */
  useEffect(() => {
    if (!hovered) return
    document.body.style.cursor = 'pointer'
    return () => {
      document.body.style.cursor = ''
    }
  }, [hovered])

  useEffect(() => {
    if (!interactive && hoveredIsland === island.id) setHoveredIsland(null)
  }, [interactive, hoveredIsland, island.id, setHoveredIsland])

  const handleClick = useCallback(() => {
    if (!interactive) return
    setPressed(true)
    gsap.fromTo(
      pulse.current,
      { value: 1 },
      { value: 0, duration: 0.5, ease: 'power2.out' },
    )
    confirmCall.current?.kill()
    confirmCall.current = gsap.delayedCall(CONFIRM_DELAY, () => {
      enterIsland(island.id)
      setPressed(false)
    })
  }, [interactive, enterIsland, island.id])

  useFrame((state, delta) => {
    const group = groupRef.current
    const inner = innerRef.current
    if (!group || !inner) return

    const dt = Math.min(delta, 0.1)
    // Reduced motion holds the islands still rather than bobbing them.
    const t = reduced ? 0 : state.clock.elapsedTime
    const presence = frame.current.islandPresence

    /* Materialise (Beat 4). Scaling from zero rather than fading avoids making
       every island material transparent, which would force them all into the
       sorted transparent pass for the whole session to serve a two-second
       intro. `visible` skips the draw entirely until they are wanted. */
    const eased = presence * presence * (3 - 2 * presence)
    group.visible = presence > 0.005

    nightRef.current = frame.current.nightPresence
    activeRef.current = damp(activeRef.current, isFocus ? 1 : 0, 5, dt)

    /* Idle motion winds down to nothing once this island is the destination.
       The parked camera pose is derived from where the television's screen is,
       so an island still swaying by a few degrees would drift the picture out
       of the shot that was calculated for it, and text on a bobbing screen is
       unreadable anyway. */
    const stillness = 1 - activeRef.current
    const { amplitude, period, phase: phaseOffset, swayPeriod } = island.idle
    const bob = Math.sin((t / period) * Math.PI * 2 + phaseOffset) * amplitude * stillness
    const sway = Math.sin((t / swayPeriod) * Math.PI * 2 + phaseOffset * 0.7) * stillness

    group.position.set(
      island.position[0],
      island.position[1] + bob * eased,
      island.position[2],
    )
    group.rotation.y = sway * 0.06
    group.rotation.z = Math.sin((t / (swayPeriod * 1.37)) * Math.PI * 2) * 0.012 * stillness

    // Hover lift (~1.03-1.05x) plus the click pulse, damped so nothing snaps.
    const hoverTarget = hovered ? 1.045 : 1
    hoverScale.current = damp(hoverScale.current, hoverTarget, 7, dt)
    inner.scale.setScalar(
      island.scale * eased * (hoverScale.current + pulse.current.value * 0.055),
    )
  })

  return (
    <group
      ref={groupRef}
      onPointerOver={(event) => {
        event.stopPropagation()
        if (interactive) setHoveredIsland(island.id)
      }}
      onPointerOut={(event) => {
        event.stopPropagation()
        setHoveredIsland(null)
      }}
      onClick={(event) => {
        event.stopPropagation()
        handleClick()
      }}
    >
      <group ref={innerRef}>
        {children}

        {/* The set. Sits on its own small deck out toward the island's edge so
            it never collides with whatever that island already has on it, and
            so it reads as something placed there to be watched rather than
            another piece of scenery. */}
        <group position={island.tv.position} rotation={[0, island.tv.rotationY, 0]}>
          <mesh position={[0, -0.09, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.95, 1.08, 0.16, 7]} />
            <meshStandardMaterial color="#6E6A5E" flatShading roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.62, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.62, 0.8, 6]} />
            <meshStandardMaterial color="#4C4A44" flatShading roughness={0.95} />
          </mesh>
        </group>
        <Television
          position={island.tv.position}
          rotationY={island.tv.rotationY}
          accent={island.accent}
          numeral={String(island.index + 1).padStart(2, '0')}
          label={island.label}
          scale={island.tv.scale}
          nightRef={nightRef}
          activeRef={activeRef}
        />

        {/* Accent rim (§6). A dim point light inside the island's silhouette
            picks out its facets in its own colour on hover, which reads as the
            island lighting up rather than as a flat outline shader. */}
        <RimLight island={island} active={hovered || pressed || isFocus} />
      </group>

      {phase === 'sky' && (
        <Html
          position={[0, island.labelHeight, 0]}
          center
          distanceFactor={12}
          style={{ pointerEvents: 'none' }}
        >
          <div className="island-destination" data-hovered={hovered}>
            <span>{island.section}</span>
            <strong>{island.label}</strong>
          </div>
        </Html>
      )}
    </group>
  )
}

/* ----------------------------------------------------------------------------
   Lamps that come on at night. The emissive meshes are free, so every tier
   gets those. The warm point light is not: three of them plus the accent rim
   plus the key is more than the low tier's fill-rate budget allows, so it is
   gated. Losing it costs atmosphere, not legibility, because the hemisphere
   fill is deliberately lifted at night.
   -------------------------------------------------------------------------- */
/* ----------------------------------------------------------------------------
   Night lighting is carried entirely by the moon.

   There were lamp posts around each island's rim here. They were removed: the
   thing that makes the night view work is the single hard moonlight source and
   the long shadows it throws across the geometry, and half a dozen warm point
   lights per island washed exactly those shadows out. One light, real shadows,
   and the emissive television screens as the only local glow.
   -------------------------------------------------------------------------- */

function RimLight({ island, active }: { island: IslandDef; active: boolean }) {
  const ref = useRef<import('three').PointLight>(null)
  useFrame((_, delta) => {
    const light = ref.current
    if (!light) return
    light.intensity = damp(light.intensity, active ? 9 : 0, 6, Math.min(delta, 0.1))
  })
  return (
    <pointLight
      ref={ref}
      color={island.accent}
      intensity={0}
      distance={island.radius * 2.6}
      decay={1.5}
      position={[0, 1.1, 1.2]}
    />
  )
}
