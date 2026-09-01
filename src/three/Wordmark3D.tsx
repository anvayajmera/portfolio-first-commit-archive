/* ============================================================================
   WORDMARK — extruded type that acts as a HUD element.
   ----------------------------------------------------------------------------
   THE DISSOLVE (Beat 2), which is the trickiest thing in the build:

   1. The HTML title measures itself and publishes its rect (lib/titleMetrics).
   2. This component sizes and places the 3D wordmark so it projects onto
      exactly that rect. At the swap instant the two are pixel-aligned.
   3. Crucially, the 3D wordmark starts at rotation ZERO — dead face-on. Its
      silhouette is then identical to flat text, so the crossfade has nothing
      to give it away.
   4. Only AFTER the crossfade completes does it rotate. That turn is what
      sells the dimensionality: you were looking at type, and then it turns and
      it was always an object. Rotating during the fade would betray the trick
      early and read as two different things smeared together.

   HUD BEHAVIOUR (Beat 3 onward): the wordmark is positioned in front of the
   camera every frame rather than parented into the scene graph, so it stays
   locked to the top-right corner through every camera flight. It carries its
   own light as a child, so its shading is constant no matter which way the
   camera is pointing — a world light would let it fall dark mid-flight.

   Depth: kept at DISTANCE = 4 with depth testing ON. Disabling depth test
   would be the obvious way to guarantee it draws on top, but the extrusion
   needs depth testing against ITSELF or the back faces punch through the
   front. 4 units clears the nearest island surface at every settle pose
   (closest is Contact at ~4.3), so nothing ever gets between it and the lens.
   ========================================================================= */

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Center, Text3D } from '@react-three/drei'
import {
  Box3,
  Color,
  MathUtils,
  Object3D,
  Vector3,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  type PerspectiveCamera,
} from 'three'
import { useExperience } from '../lib/experience'
import { titleMetrics } from '../lib/titleMetrics'
import { damp, lerp, useReducedMotion } from '../lib/motion'

export const WORDMARK_TEXT = 'Anvay Ajmera'
/** Caret shown while the name is being typed. */
const CARET = '_'
const FONT_URL = '/fonts/wordmark.typeface.json'

/** Distance in front of the camera. See the depth note above. */
const DISTANCE = 4

/** Corner pose: width as a fraction of the viewport, and the margin around it. */
const CORNER_WIDTH_FRACTION_LANDSCAPE = 0.2
const CORNER_WIDTH_FRACTION_PORTRAIT = 0.44
const CORNER_MARGIN_PX = 46

export default function Wordmark3D() {
  const { frame, phase } = useExperience()
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const reduced = useReducedMotion()
  const panelOpen = phase === 'island'
  const dayColor = useMemo(() => new Color('#13233A'), [])
  const nightColor = useMemo(() => new Color('#EEF3FF'), [])

  const groupRef = useRef<Group>(null)
  /* How many characters are currently shown. Held in React state, not on the
     frame object, because changing it rebuilds the extruded geometry and that
     has to go through a render. It only changes a dozen times, during the
     intro, so the cost is irrelevant; doing it per frame would not be. */
  /* Starts COMPLETE for exactly one frame. The scale is derived from the full
     string's natural width, and that can only be measured from geometry that
     exists, so the first render lays out the whole name and stores its width
     before the frame loop resets this to zero and typing begins. Nothing is
     visible during that frame: the material opacity is still 0 at that point
     in the intro. */
  const [typed, setTyped] = useState(WORDMARK_TEXT.length)
  const innerRef = useRef<Group>(null)
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<MeshStandardMaterial>(null)
  const lightTargetRef = useRef<Object3D>(null)

  /** Natural width of the geometry at size=1, measured once it exists. */
  const naturalWidth = useRef(1)
  /** Natural width of the COMPLETE name. Scale is always derived from this so
      that letters keep a constant size as they appear, instead of the whole
      string being squeezed to a fixed width and the glyphs shrinking with every
      keystroke. */
  const fullWidth = useRef(0)
  const offset = useMemo(() => new Vector3(), [])

  /* The caret is part of the extruded string rather than a separate mesh, so
     it sits on the same baseline and the same material with no extra bookkeeping.
     It disappears once the name is complete, the way a real one does when you
     stop typing. */
  const complete = typed >= WORDMARK_TEXT.length
  const visible = complete
    ? WORDMARK_TEXT
    : WORDMARK_TEXT.slice(0, typed) + CARET

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh?.geometry) return
    mesh.geometry.computeBoundingBox()
    const box = mesh.geometry.boundingBox as Box3 | null
    if (!box) return
    naturalWidth.current = Math.max(0.001, box.max.x - box.min.x)
    if (visible === WORDMARK_TEXT) fullWidth.current = naturalWidth.current
  })

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1)

    // Read the typed progress off the frame object and only re-render when the
    // character count actually changes.
    const wanted = Math.round(frame.current.wordmarkTyped * WORDMARK_TEXT.length)
    if (wanted !== typed) setTyped(wanted)

    const group = groupRef.current
    const inner = innerRef.current
    const material = materialRef.current
    if (!group || !inner || !material) return

    const f = frame.current
    const t = state.clock.elapsedTime
    const placement = f.wordmarkPlacement

    const fov = MathUtils.degToRad(camera.fov)
    const halfHeight = DISTANCE * Math.tan(fov / 2)
    const halfWidth = halfHeight * camera.aspect

    /* --- Pose A: exactly over the HTML title ---------------------------- */
    const heroWidth = titleMetrics.widthFraction * halfWidth * 2
    const heroX = titleMetrics.centerNdcX * halfWidth
    const heroY = titleMetrics.centerNdcY * halfHeight

    /* --- Pose B: parked in the top-right corner ------------------------- */
    const portrait = camera.aspect < 1
    const cornerWidth =
      (portrait ? CORNER_WIDTH_FRACTION_PORTRAIT : CORNER_WIDTH_FRACTION_LANDSCAPE) *
      halfWidth *
      2
    // Margin expressed in px, converted through the viewport into world units,
    // so the gap to the screen edge is constant at every size.
    const marginX = (CORNER_MARGIN_PX / size.width) * halfWidth * 2
    const marginY = (CORNER_MARGIN_PX / size.height) * halfHeight * 2
    /* Top LEFT. The name is the first thing read on any page, and the top-left
       is where a reader's eye already starts; the top-right is where controls
       live. This also lets the extruded type replace the flat HTML nameplate
       entirely rather than the two competing for the same corner. */
    const cornerX = -halfWidth + marginX + cornerWidth / 2
    /* The vertical allowance is measured against the wordmark's WIDTH because
       that is the dimension being set; "Anvay Ajmera" is about 0.14 as tall as
       it is wide, and <Center> centres on the full glyph box including the
       descenders on y and j. Half of that plus a little slack is 0.11, and the
       earlier 0.12 was cutting the ascenders off against the top of the frame
       once the type was rotated into its three-quarter rest pose. */
    const cornerY = halfHeight - marginY - cornerWidth * 0.19

    /* --- Blend, then place in front of the camera ----------------------- */
    const width = lerp(heroWidth, cornerWidth, placement)
    const x = lerp(heroX, cornerX, placement)
    const y = lerp(heroY, cornerY, placement)

    // Idle (§6): present enough not to read as a sticker, small enough to
    // ignore. Scaled by placement so it does not wobble during the hero beat,
    // and off entirely under reduced motion — a permanently drifting element
    // in the corner is exactly what that preference is asking to stop.
    const idle = reduced ? 0 : placement
    const bobY = Math.sin(t * 0.62) * halfHeight * 0.008 * idle
    const swayX = Math.sin(t * 0.41 + 1.2) * halfWidth * 0.004 * idle

    offset.set(x + swayX, y + bobY, -DISTANCE).applyQuaternion(camera.quaternion)
    group.position.copy(camera.position).add(offset)
    group.quaternion.copy(camera.quaternion)

    const scale = width / (fullWidth.current || naturalWidth.current)
    inner.scale.setScalar(scale)

    /* Rotation. Zero during the crossfade (silhouette must match the flat
       text), then turns into a three-quarter view as it travels to the corner,
       plus a slow drift that keeps catching the light. */
    const settledYaw = 0.26
    const settledPitch = 0.10
    inner.rotation.y = settledYaw * placement + Math.sin(t * 0.5) * 0.05 * idle
    inner.rotation.x = settledPitch * placement + Math.sin(t * 0.37 + 0.7) * 0.025 * idle

    /* Recedes while a panel is open. The picture covers most of the frame at
       that point, so the name behind it is just clutter showing through the
       edges, and it competes with the heading that is the actual thing being
       read. It comes straight back on the way out. */
    const target = f.wordmarkPresence * (panelOpen ? 0 : 1)
    material.opacity = damp(material.opacity, target, 6, dt)

    /* Deep navy in daylight, near-white at night. The navy is the whole point
       of the wordmark in the day, when it reads as a hard silhouette against
       the sky, and it is exactly why it disappears after dark against a sky
       that is very nearly the same colour. */
    material.color.copy(dayColor).lerp(nightColor, f.nightPresence)
    material.transparent = f.wordmarkPresence < 0.999

    if (lightTargetRef.current) lightTargetRef.current.updateMatrixWorld()
  })

  return (
    <group ref={groupRef} renderOrder={1000}>
      <group ref={innerRef}>
        <Center>
          <Text3D
            ref={meshRef}
            font={FONT_URL}
            size={1}
            /* `height` is the extrusion depth. Shallow: a deep extrusion reads
               as a logo made of chocolate, and at corner size the sides would
               be a single dark pixel anyway. */
            height={0.17}
            curveSegments={4}
            bevelEnabled
            bevelThickness={0.018}
            bevelSize={0.014}
            bevelOffset={0}
            bevelSegments={2}
          >
            {visible}
            <meshStandardMaterial
              ref={materialRef}
              /* The same deep navy the opening frame is filled with, so the
                 name reads as the backdrop itself pushed forward into an
                 object rather than as a blue logo dropped on top of a scene.
                 Against the flat sky blue it becomes a hard silhouette, and
                 the bevel is what gives it dimension: the two dedicated lights
                 below rake across it and catch every edge. No emissive, which
                 would wash the facets flat and undo the point. */
              color="#13233A"
              metalness={0.12}
              roughness={0.42}
              transparent
              opacity={0}
            />
          </Text3D>
        </Center>

        {/* Dedicated key, parented alongside the type so the shading never
            changes as the camera swings around the world. */}
        <object3D ref={lightTargetRef} position={[0, 0, 0]} />
        <directionalLight
          position={[2.2, 3.0, 4.0]}
          intensity={3.4}
          color="#FFF2E2"
          target={lightTargetRef.current ?? undefined}
        />
        <directionalLight position={[-3.0, -1.0, 2.0]} intensity={1.5} color="#9EC6FF" />
      </group>
    </group>
  )
}
