/* ============================================================================
   CAMERA — the whole choreography system (spec §7).
   ----------------------------------------------------------------------------
   Three jobs, in priority order every frame:

   1. RESOLVE A POSE for the current phase. Intro poses are authored
      axis-aligned so the wordmark's screen-space maths stays exact; the sky
      pose is solved per viewport; island poses come from the manifest.

   2. FLY between poses along CatmullRom curves driven by a GSAP tween, so each
      island gets a genuinely different arc, ease and duration rather than the
      same zoom with different numbers.

   3. DRIFT. A few degrees of parallax follow the pointer in the sky view so
      the scene feels dimensional before anything is clicked.

   PATH WARPING is the non-obvious part. The curves in the manifest are
   authored against a 16:9 desktop, but the real endpoints move: the sky pose
   dollies back on a phone to fit all three islands, and settle poses dolly too.
   Rather than authoring a set of paths per viewport, the controller evaluates
   the authored curve and adds a corrective offset that blends linearly from
   (real start − authored start) to (real end − authored end). The arc's shape
   survives; only its endpoints are dragged onto the real poses.
   ========================================================================= */

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { Vector3, type PerspectiveCamera } from 'three'
import { SKY_TARGET, getIsland, type FlightPath } from '../lib/islands'
import { buildFlightCurves } from '../lib/flightCurves'
import { framingForAspect } from '../lib/camera'
import { useScenePoses } from './useScenePoses'
import { useExperience } from '../lib/experience'
import { damp, useReducedMotion } from '../lib/motion'

/** Intro pose. Deliberately axis-aligned (looking straight down -Z) so the
    wordmark's hero placement maths is exact rather than approximately right. */
const INTRO_CAMERA = new Vector3(0, 1.0, 8)
const INTRO_TARGET = new Vector3(0, 1.0, 0)

/** Parallax drift, in world units at the sky view. A few degrees, no more. */
const DRIFT_AMOUNT = 1.15
const DRIFT_AMOUNT_ISLAND = 0.35

export default function CameraController() {
  const { phase, setPhase, flightIsland, frame } = useExperience()
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const reduced = useReducedMotion()

  const pointer = useRef({ x: 0, y: 0 })
  const drift = useRef({ x: 0, y: 0 })
  /* Extra push toward the screen once parked. The flight ends and the panel
     opens, and with the camera frozen between those two events the arrival and
     the content read as unrelated. Continuing to creep in while the panel grows
     ties them into one movement: the camera is still going somewhere when the
     picture arrives. */
  const dwell = useRef(0)
  const scratch = useMemo(
    () => ({
      position: new Vector3(),
      target: new Vector3(),
      right: new Vector3(),
      up: new Vector3(),
      view: new Vector3(),
      curvePoint: new Vector3(),
      offsetStart: new Vector3(),
      offsetEnd: new Vector3(),
    }),
    [],
  )

  const aspect = size.width / size.height
  const poses = useScenePoses()

  /* --- Lens ------------------------------------------------------------- */
  useLayoutEffect(() => {
    const framing = framingForAspect(aspect)
    camera.fov = framing.fov
    camera.near = 0.1
    camera.updateProjectionMatrix()
  }, [camera, aspect])

  /* --- Flight ------------------------------------------------------------
     The flight is derived during render, not assigned in an effect. Effects
     run AFTER the first frame of a new phase, so an effect-assigned flight
     leaves useFrame reading stale data for one frame — which is long enough to
     show a single frame of the wrong pose.

     `progressOwner` guards the same hazard on the progress value: it is only
     trusted once the tween that owns it has actually started. Without it, a
     new inbound flight would render one frame at the previous flight's
     progress of 1, i.e. already parked at the destination.
     -------------------------------------------------------------------- */
  const activeFlight = useMemo(() => {
    if ((phase !== 'inbound' && phase !== 'outbound') || !flightIsland) return null
    const island = getIsland(flightIsland)
    const direction: 'in' | 'out' = phase === 'inbound' ? 'in' : 'out'
    const path: FlightPath = direction === 'in' ? island.inbound : island.outbound
    return { curves: buildFlightCurves(path), path, island, direction }
  }, [phase, flightIsland])

  const progressOwner = useRef<typeof activeFlight>(null)

  /* Where the camera actually was when the flight began. Using this rather
     than the authored start point means a flight can begin from anywhere:
     island-to-island jumps via the nav dots work without a cut, and the
     pointer drift offset at the moment of the click does not snap away. */
  const flightStart = useRef({ position: new Vector3(), target: new Vector3() })
  const lastTarget = useRef(new Vector3(...SKY_TARGET))

  useEffect(() => {
    if (!activeFlight) {
      progressOwner.current = null
      return
    }

    flightStart.current.position.copy(camera.position)
    flightStart.current.target.copy(lastTarget.current)
    frame.current.flightProgress = 0
    progressOwner.current = activeFlight

    const done = () => setPhase(activeFlight.direction === 'in' ? 'island' : 'sky')

    // Reduced motion (§7): no flight. Cut to the destination and let the panel
    // crossfade carry the transition. The same state machine runs either way.
    if (reduced) {
      frame.current.flightProgress = 1
      const call = gsap.delayedCall(0.16, done)
      return () => {
        call.kill()
      }
    }

    const tween = gsap.to(frame.current, {
      flightProgress: 1,
      duration: activeFlight.path.duration,
      ease: activeFlight.path.ease,
      onComplete: done,
    })
    return () => {
      tween.kill()
    }
  }, [activeFlight, reduced, setPhase, frame, camera])

  /* --- Pointer parallax -------------------------------------------------- */
  useEffect(() => {
    function onMove(event: PointerEvent) {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = -((event.clientY / window.innerHeight) * 2 - 1)
    }
    function onLeave() {
      pointer.current.x = 0
      pointer.current.y = 0
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  /* --- Per-frame resolve -------------------------------------------------- */
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1)
    const f = frame.current
    const { position, target } = scratch

    switch (phase) {
      case 'loading':
      case 'title':
      case 'dissolve':
      case 'relocate':
        position.copy(INTRO_CAMERA)
        target.copy(INTRO_TARGET)
        break

      case 'reveal': {
        // Beat 4: the pull-back. Eased in the timeline, so a straight lerp here.
        const t = f.cameraReveal
        position.lerpVectors(INTRO_CAMERA, poses.sky.position, t)
        target.lerpVectors(INTRO_TARGET, poses.sky.target, t)
        break
      }

      case 'inbound':
      case 'outbound': {
        const active = activeFlight
        if (!active) {
          position.copy(poses.sky.position)
          target.copy(poses.sky.target)
          break
        }
        const islandPose = poses.island.get(active.island.id)!
        const realStart = flightStart.current.position
        const realStartTarget = flightStart.current.target
        const realEnd = active.direction === 'in' ? islandPose.position : poses.sky.position
        const realEndTarget = active.direction === 'in' ? islandPose.target : poses.sky.target

        // Only trust the progress value once its own tween has started.
        const t = progressOwner.current === active ? f.flightProgress : 0

        // Warp: blend the endpoint corrections across the curve, so the
        // authored arc keeps its shape while its ends are dragged onto the
        // real poses for this viewport.
        active.curves.position.getPoint(0, scratch.offsetStart)
        scratch.offsetStart.copy(realStart).sub(scratch.offsetStart)
        active.curves.position.getPoint(1, scratch.offsetEnd)
        scratch.offsetEnd.copy(realEnd).sub(scratch.offsetEnd)

        active.curves.position.getPoint(t, scratch.curvePoint)
        position
          .copy(scratch.curvePoint)
          .addScaledVector(scratch.offsetStart, 1 - t)
          .addScaledVector(scratch.offsetEnd, t)

        active.curves.look.getPoint(0, scratch.offsetStart)
        scratch.offsetStart.copy(realStartTarget).sub(scratch.offsetStart)
        active.curves.look.getPoint(1, scratch.offsetEnd)
        scratch.offsetEnd.copy(realEndTarget).sub(scratch.offsetEnd)

        active.curves.look.getPoint(t, scratch.curvePoint)
        target
          .copy(scratch.curvePoint)
          .addScaledVector(scratch.offsetStart, 1 - t)
          .addScaledVector(scratch.offsetEnd, t)
        break
      }

      case 'island': {
        const pose = flightIsland ? poses.island.get(flightIsland) : undefined
        position.copy(pose?.position ?? poses.sky.position)
        target.copy(pose?.target ?? poses.sky.target)
        break
      }

      case 'sky':
      default:
        position.copy(poses.sky.position)
        target.copy(poses.sky.target)
        break
    }

    /* Dwell push. Only after arrival, and small: this is a settling move, not
       a second flight. */
    const wantDwell = phase === 'island' ? 1 : 0
    dwell.current = damp(dwell.current, wantDwell, reduced ? 40 : 1.7, dt)
    if (dwell.current > 0.001) {
      scratch.view.subVectors(target, position)
      position.addScaledVector(scratch.view, dwell.current * 0.13)
    }

    /* Parallax drift. Applied perpendicular to the view axis so it reads as the
       camera swaying rather than the world sliding. Suppressed during the intro
       and during flights, where it would fight the choreography. */
    const driftable = phase === 'sky' || phase === 'island'
    const amount = phase === 'island' ? DRIFT_AMOUNT_ISLAND : DRIFT_AMOUNT
    const wantX = driftable && !reduced ? pointer.current.x * amount : 0
    const wantY = driftable && !reduced ? pointer.current.y * amount * 0.6 : 0
    drift.current.x = damp(drift.current.x, wantX, 2.6, dt)
    drift.current.y = damp(drift.current.y, wantY, 2.6, dt)

    scratch.view.subVectors(target, position).normalize()
    scratch.right.crossVectors(scratch.view, camera.up).normalize()
    scratch.up.crossVectors(scratch.right, scratch.view).normalize()
    position.addScaledVector(scratch.right, drift.current.x)
    position.addScaledVector(scratch.up, drift.current.y)

    /* During the intro the camera is authored, not damped — the timeline owns
       the easing. Everywhere else a light damp smooths the pointer drift and
       any pose change that was not tweened. */
    const settled = phase === 'sky' || phase === 'island'
    if (settled) {
      camera.position.set(
        damp(camera.position.x, position.x, 5.5, dt),
        damp(camera.position.y, position.y, 5.5, dt),
        damp(camera.position.z, position.z, 5.5, dt),
      )
    } else {
      camera.position.copy(position)
    }

    camera.lookAt(target)
    lastTarget.current.copy(target)
  })

  /* Keep the far plane honest when the sky pose dollies a long way back. */
  useEffect(() => {
    camera.far = Math.max(400, poses.sky.position.length() * 4)
    camera.updateProjectionMatrix()
  }, [camera, poses])

  return null
}
