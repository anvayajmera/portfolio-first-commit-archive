/* ============================================================================
   SCENE — everything inside the <Canvas>.
   ========================================================================= */

import { useEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, Fog, Vector3 } from 'three'
import { useExperience } from '../lib/experience'
import { useReducedMotion } from '../lib/motion'
import { ISLANDS, getIsland, tvWorldPose } from '../lib/islands'
import type { QualitySettings, QualityTier } from '../lib/quality'
import GsapBridge from './GsapBridge'
import Sky, { SKY_DAY, SKY_NIGHT, VOID_DAY, VOID_NIGHT } from './Sky'
import Clouds from './Clouds'
import NightSky from './NightSky'
import Birds from './Birds'
import Bridges from './Bridges'
import Lighting from './Lighting'
import CameraController from './CameraController'
import Wordmark3D from './Wordmark3D'
import PerformanceGovernor from './PerformanceGovernor'
import IslandBase from './islands/IslandBase'
import PortfolioIsland from './islands/PortfolioIsland'
import ProjectsIsland from './islands/ProjectsIsland'
import ContactIsland from './islands/ContactIsland'
import { useScenePoses } from './useScenePoses'

export default function Scene({
  quality,
  onDowngrade,
  onReady,
}: {
  quality: QualitySettings
  onDowngrade: (next: QualityTier) => void
  onReady: () => void
}) {
  /* Reaching this point means Suspense resolved, which means the extruded
     typeface has parsed. That is the last asset the intro depends on, so it is
     the honest moment to tell the loader it can stand down (§9). */
  useEffect(() => {
    onReady()
  }, [onReady])

  return (
    <>
      <GsapBridge />
      <PerformanceGovernor tier={quality.tier} onDowngrade={onDowngrade} />
      <CameraController />
      <Atmosphere />

      <Sky />
      <NightSky quality={quality} />
      <ThemeDriver />
      <TvAnchor />
      {/* Keyed on the tier: a downgrade changes the instance count and the
          shadow-map size, neither of which can be mutated in place — the
          instanced buffers and the shadow render target have to be rebuilt.
          Remounting is the honest way to do that. */}
      <Clouds key={`clouds-${quality.tier}`} quality={quality} />
      <Birds key={`birds-${quality.tier}`} quality={quality} />
      <Lighting key={`lighting-${quality.tier}`} quality={quality} />

      <Bridges quality={quality} />

      <IslandBase island={ISLANDS[0]}>
        <PortfolioIsland quality={quality} />
      </IslandBase>
      <IslandBase island={ISLANDS[1]}>
        <ProjectsIsland quality={quality} />
      </IslandBase>
      <IslandBase island={ISLANDS[2]}>
        <ContactIsland quality={quality} />
      </IslandBase>

      <Wordmark3D />
    </>
  )
}

/* ----------------------------------------------------------------------------
   Publishes where the active island's television screen currently is, in
   viewport percentages, as CSS custom properties.

   This is what makes clicking an island read as going INTO the set. The panel
   uses these as its transform-origin, so the CRT switch-on animation opens out
   from the actual position of the picture in the frame rather than from the
   middle of the screen. Without it the camera flies to a television and then a
   rectangle appears in the centre of the window, and the two events look
   unrelated.

   Percentages rather than pixels so the value survives a resize between frames,
   and written straight to the document rather than through React because it
   changes every frame of a flight.
   -------------------------------------------------------------------------- */
function TvAnchor() {
  const { phase, flightIsland } = useExperience()
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const projected = useMemo(() => new Vector3(), [])

  useFrame(() => {
    if (!flightIsland || (phase !== 'inbound' && phase !== 'island' && phase !== 'outbound')) return
    const island = getIsland(flightIsland)
    const pose = tvWorldPose(island)
    projected.set(...pose.screen).project(camera)

    const x = (projected.x * 0.5 + 0.5) * 100
    const y = (-projected.y * 0.5 + 0.5) * 100
    const root = document.documentElement.style
    root.setProperty('--tv-x', `${x.toFixed(2)}%`)
    root.setProperty('--tv-y', `${y.toFixed(2)}%`)
  })

  void size
  return null
}

/* ----------------------------------------------------------------------------
   Drives the day/night crossfade. The theme itself is React state (the toggle
   button needs to re-render), but the value the GPU reads is a plain number on
   the frame object, tweened by GSAP. Routing a per-frame float through React
   would re-render the tree sixty times a second to carry one value.
   -------------------------------------------------------------------------- */
function ThemeDriver() {
  const { theme, frame } = useExperience()
  const reduced = useReducedMotion()
  const gl = useThree((s) => s.gl)

  /* Exposure is the lever that actually makes it look like night. Turning the
     lights down alone was not enough: a saturated green lit at low intensity
     still reads as grass in daylight, because the eye judges the scene by the
     relationship between its brightest and darkest parts, not by absolute
     values. Pulling the whole frame down through tone mapping compresses that
     relationship the way a real camera does after dark, and the emissive
     lamps and television screens then genuinely become the brightest things
     in the shot rather than merely being lighter green. */
  useFrame(() => {
    gl.toneMappingExposure = 1.02 - frame.current.nightPresence * 0.34
  })

  useEffect(() => {
    const target = theme === 'night' ? 1 : 0
    if (reduced) {
      frame.current.nightPresence = target
      return
    }
    const tween = gsap.to(frame.current, {
      nightPresence: target,
      duration: 1.1,
      ease: 'power2.inOut',
    })
    return () => {
      tween.kill()
    }
  }, [theme, frame, reduced])

  return null
}

/* ----------------------------------------------------------------------------
   Fog. Two things it has to get right:

   · Colour tracks the sky reveal, so during Beat 1 the far distance is the
     same near-black as the title card and there is no coloured haze giving
     away that a world is waiting behind it.
   · Near/far SCALE with how far the sky camera had to dolly back. On a phone
     the camera sits ~2.7x further out, and fixed fog distances tuned on a
     desktop would bury all three islands in haze.
   -------------------------------------------------------------------------- */
function Atmosphere() {
  const scene = useThree((s) => s.scene)
  const { frame } = useExperience()
  const poses = useScenePoses()

  const fog = useMemo(() => new Fog(new Color(VOID_DAY).getHex(), 30, 110), [])
  const voidDay = useMemo(() => new Color(VOID_DAY), [])
  const voidNight = useMemo(() => new Color(VOID_NIGHT), [])
  const skyDay = useMemo(() => new Color(SKY_DAY), [])
  const skyNight = useMemo(() => new Color(SKY_NIGHT), [])
  const start = useRef(new Color())
  const end = useRef(new Color())

  useFrame(() => {
    if (scene.fog !== fog) scene.fog = fog
    const night = frame.current.nightPresence
    /* Fog has to land on exactly the sky colour at every point of the day/night
       crossfade, or the horizon shows a seam where the haze and the backdrop
       disagree. Resolve both ends for the current time of day first, then fade
       between them with the intro presence. */
    start.current.copy(voidDay).lerp(voidNight, night)
    end.current.copy(skyDay).lerp(skyNight, night)
    fog.color.copy(start.current).lerp(end.current, frame.current.skyPresence)
    fog.near = 30 * poses.fit
    fog.far = 118 * poses.fit
  })

  return null
}
