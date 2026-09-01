/* ============================================================================
   EXPERIENCE STATE — the single source of truth for "where are we".
   ----------------------------------------------------------------------------
   Two kinds of state, deliberately kept apart:

   · `phase` / `activeIsland` are React state. They change a handful of times
     per session and the HTML layer needs to re-render when they do.

   · `frame` is a MUTABLE object behind a ref, written by GSAP and read in
     useFrame. It changes every frame during the intro and every flight.
     Routing that through React state would re-render the entire tree at 60fps
     to carry a float, which is the most expensive thing you can do in R3F.

   Nothing reads `frame` outside a useFrame callback, and nothing writes it
   outside a GSAP tween. That rule is what keeps the two systems from fighting.
   ========================================================================= */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { IslandId } from './islands'

export type Phase =
  | 'loading' // assets initialising; branded loader is up
  | 'title' //   Beat 1 — HTML title card, near-black ground
  | 'dissolve' // Beat 2 — 2D cross-fades into extruded 3D
  | 'relocate' // Beat 3 — wordmark flies to its corner
  | 'reveal' //  Beat 4 — camera pulls back, sky and islands arrive
  | 'sky' //     Beat 5 — steady state / home
  | 'inbound' // Beat 6 — flying to an island
  | 'island' //  Beat 7 — parked, panel open
  | 'outbound' // Beat 8 — flying home

/** Everything the 3D layer animates per frame. Mutated in place; never cloned. */
export interface FrameState {
  /** 0 = flat 2D title still showing, 1 = extruded wordmark fully present. */
  wordmarkPresence: number
  /** How much of the name has been typed, 0..1. Drives the intro's
      letter-by-letter reveal and the blinking caret. */
  wordmarkTyped: number
  /** 0 = centre-screen hero pose, 1 = parked in the corner. */
  wordmarkPlacement: number
  /** 0 = near-black void, 1 = full dusk sky gradient. */
  skyPresence: number
  /** 0 = hidden, 1 = clouds at full opacity. */
  cloudPresence: number
  /** 0 = pushed in on the wordmark, 1 = the wide sky establishing shot. */
  cameraReveal: number
  /** 0 = islands absent, 1 = fully materialised. */
  islandPresence: number
  /** 0 = daylight, 1 = night. Animated by GSAP so the change is a dusk, not a
      light switch. Read by the sky, the lighting and the lamp emissives. */
  nightPresence: number
  /** 0..1 along the active flight curve. */
  flightProgress: number
}

export function createFrameState(): FrameState {
  return {
    wordmarkPresence: 0,
    wordmarkTyped: 0,
    wordmarkPlacement: 0,
    skyPresence: 0,
    cloudPresence: 0,
    cameraReveal: 0,
    islandPresence: 0,
    // Starts at 1 to match the default theme. Starting at 0 would make the
    // site open in daylight and visibly fade to night over the first second,
    // which reads as a bug rather than as a choice.
    nightPresence: 1,
    flightProgress: 0,
  }
}

interface ExperienceValue {
  phase: Phase
  setPhase: (phase: Phase) => void
  activeIsland: IslandId | null
  /** The island a flight is heading to or coming from. Held during outbound so
      the panel can animate out and the rim light can fade rather than cut. */
  flightIsland: IslandId | null
  hoveredIsland: IslandId | null
  setHoveredIsland: (id: IslandId | null) => void
  frame: React.RefObject<FrameState>
  enterIsland: (id: IslandId) => void
  returnToSky: () => void
  /** True once the intro has finished at least once — used to skip it on
      subsequent state changes, never to replay it. */
  introDone: boolean
  markIntroDone: () => void
  theme: Theme
  toggleTheme: () => void
}

export type Theme = 'day' | 'night'

const ExperienceContext = createContext<ExperienceValue | null>(null)

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [activeIsland, setActiveIsland] = useState<IslandId | null>(null)
  const [flightIsland, setFlightIsland] = useState<IslandId | null>(null)
  const [hoveredIsland, setHoveredIsland] = useState<IslandId | null>(null)
  const [introDone, setIntroDone] = useState(false)
  const [theme, setTheme] = useState<Theme>('night')
  const frame = useRef<FrameState>(createFrameState())

  /* Mirror of `phase` for use inside callbacks. Guarding with the ref rather
     than reading `phase` from the closure keeps the callbacks stable (no
     re-subscription on every phase change) without calling a setter from
     inside another setter's updater, which is not safe under StrictMode. */
  const phaseRef = useRef<Phase>(phase)
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const enterIsland = useCallback((id: IslandId) => {
    // Ignore clicks mid-flight; a second flight starting while one is running
    // gives two GSAP tweens fighting over the same camera.
    if (phaseRef.current !== 'sky' && phaseRef.current !== 'island') return
    setFlightIsland(id)
    setActiveIsland(null)
    setPhase('inbound')
  }, [])

  const returnToSky = useCallback(() => {
    if (phaseRef.current !== 'island') return
    setActiveIsland(null)
    setPhase('outbound')
  }, [])

  /* Arrival and departure bookkeeping. Keeping this here rather than in the
     camera controller means the panel's open/close state is derived from the
     phase machine, not from an animation callback firing at the right time. */
  useEffect(() => {
    if (phase === 'island') setActiveIsland(flightIsland)
    if (phase === 'sky') setFlightIsland(null)
  }, [phase, flightIsland])

  const markIntroDone = useCallback(() => setIntroDone(true), [])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'day' ? 'night' : 'day'))
  }, [])

  const value = useMemo<ExperienceValue>(
    () => ({
      phase,
      setPhase,
      activeIsland,
      flightIsland,
      hoveredIsland,
      setHoveredIsland,
      frame,
      enterIsland,
      returnToSky,
      introDone,
      markIntroDone,
      theme,
      toggleTheme,
    }),
    [
      phase,
      activeIsland,
      flightIsland,
      hoveredIsland,
      enterIsland,
      returnToSky,
      introDone,
      markIntroDone,
      theme,
      toggleTheme,
    ],
  )

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>
}

export function useExperience(): ExperienceValue {
  const value = useContext(ExperienceContext)
  if (!value) throw new Error('useExperience must be used inside <ExperienceProvider>')
  return value
}
