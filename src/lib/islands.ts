/* ============================================================================
   ISLAND MANIFEST — the spine of the whole experience.
   ----------------------------------------------------------------------------
   Positions, accents, idle timing and camera choreography all live here so the
   composition can be reasoned about (and verified — see scripts/check-scene.ts)
   without reading three components.

   COMPOSITION NOTE. The three islands are placed to land on rough thirds in
   screen space from the sky view, at three genuinely different depths so the
   parallax drift separates them. Deliberately NOT symmetrical:

        .                       Contact sits high and far, small and quiet
                 [wordmark]     top-right is reserved for the wordmark
                     .          Projects, mid-right, mid-depth
     .                          Portfolio, low-left, nearest and largest

   Nothing is placed in the top-right quadrant: that belongs to the wordmark
   after Beat 3, and an island under it would fight for the same attention.
   ========================================================================= */

/* NOTE: this module must not import three. The HTML panels and nav read it,
   and they ship in the shell chunk that paints before the 3D runtime loads —
   one `import { Vector3 }` here pulls all of three.js into that chunk. The
   curve building lives in lib/flightCurves.ts for exactly this reason. */

export const ISLAND_IDS = ['portfolio', 'projects', 'contact'] as const
export type IslandId = (typeof ISLAND_IDS)[number]

export type Vec3 = [x: number, y: number, z: number]

export interface FlightPath {
  /** Camera positions through the flight, including start and end. */
  via: Vec3[]
  /** Look-at points through the flight, including start and end. */
  look: Vec3[]
  /** Seconds. Section 7 asks for 1.2-2s. */
  duration: number
  /** GSAP ease. Varied per island so the three flights do not feel identical. */
  ease: string
}

export interface IslandDef {
  id: IslandId
  index: number
  label: string
  /** Plain-language section name shown above the more distinctive island name. */
  section: string
  /** Short line for the nav tooltip / screen-reader description. */
  blurb: string
  /** Accent, as a hex string. Also drives the focus rim light (§8). */
  accent: string
  /** Art-direction scale. Kept in the manifest so framing and geometry agree. */
  scale: number
  /** Local height for the permanent destination label. */
  labelHeight: number
  /** World-space centre of the island. */
  position: Vec3
  /** Bounding radius, used for framing checks and hover hit volume. */
  radius: number
  /** The walkable surface, in island-local units before `scale` is applied.
      Bridges land on this, not on `radius`: the bounding radius includes the
      underside cone and overshoots the grass by a couple of units, which is
      what left the walkways ending in mid-air short of the land. */
  deck: { y: number; radius: number }
  /** Idle bob: amplitude in world units, period in seconds, phase in radians.
      Phases are deliberately incommensurate so the three never re-sync. */
  idle: { amplitude: number; period: number; phase: number; swayPeriod: number }
  /** The television standing on this island. Local to the island, before the
      island's own scale is applied. */
  tv: {
    position: Vec3
    /** Y rotation in radians. The screen faces this way. */
    rotationY: number
    scale: number
  }
  /** Where the camera parks when this island is active. Derived from the
      television by `tvSettlePose`, not authored: the camera has to arrive
      square to the screen or the picture-becomes-panel handoff does not read.
      Kept in the manifest only as the value the flight paths were drawn
      against. */
  settle: Vec3
  inbound: FlightPath
  outbound: FlightPath
}

/** The resting establishing shot (Beat 5). */
export const SKY_CAMERA: Vec3 = [0, 15.5, 23]
export const SKY_TARGET: Vec3 = [0, 0.3, 0]

/**
 * The camera looks slightly PAST the television so the set sits off-centre and
 * the panel gets clean space beside it. Desktop pushes the look-at right (the
 * set reads left); portrait pushes it down (the set reads high, the panel
 * takes the bottom as a sheet).
 *
 * These are much smaller than they were when the camera framed a whole island
 * from twenty units away. The parked camera now sits about seven units from a
 * television, so the same numbers would have pushed it clean out of frame.
 */
export const FRAMING_SHIFT_LANDSCAPE: Vec3 = [1.35, 0.15, 0]
export const FRAMING_SHIFT_PORTRAIT: Vec3 = [0, -0.85, 0]

export const ISLANDS: readonly IslandDef[] = [
  {
    id: 'portfolio',
    index: 0,
    label: 'About',
    section: 'Who I am',
    blurb: 'Who I am, what I am good at, photos, and how to reach me.',
    accent: '#D47745',
    scale: 1.77,
    labelHeight: 4.2,
    position: [-10.09, -1.8, 2.32],
    radius: 6.96,
    deck: { y: 0.46, radius: 3.2 },
    idle: { amplitude: 0.22, period: 7.3, phase: 0.0, swayPeriod: 19.1 },
    tv: { position: [1.75, 0.46, 2.15], rotationY: 0.683, scale: 0.62 },
    settle: [-14.69, 9.06, 17.07],
    inbound: {
      // Rises, then swings wide LEFT and settles back in — the plateau's tiers
      // are read edge-on during the pass before the camera comes round to face
      // them. Waypoints are spaced so the curve never doubles back: an earlier
      // draft went left-then-right in the last two points and CatmullRom put a
      // 15 degree kink in it, which reads as the camera flinching.
      via: [SKY_CAMERA, [-2.0, 12.0, 20.0], [-7.2, 9.0, 17.0], [-11.4, 7.0, 14.2], [-14.69, 9.06, 17.07]],
      look: [SKY_TARGET, [-3.5, 0.6, 1.0], [-7.0, -1.0, 1.8], [-10.09, -1.8, 2.32]],
      duration: 1.9,
      ease: 'power2.inOut',
    },
    outbound: {
      via: [[-14.69, 9.06, 17.07], [-10.2, 11.2, 19.4], [-4.0, 12.1, 21.0], SKY_CAMERA],
      look: [[-10.09, -1.8, 2.32], [-3.0, 0.4, 1.0], SKY_TARGET],
      duration: 1.5,
      ease: 'power2.inOut',
    },
  },
  {
    id: 'projects',
    index: 1,
    label: 'Projects',
    section: 'Work',
    blurb: 'Three builds worth reading about, and what they have won.',
    accent: '#137C8B',
    scale: 1.77,
    labelHeight: 4.2,
    position: [9.28, -0.9, -2.55],
    radius: 7.32,
    deck: { y: 0.49, radius: 3.48 },
    idle: { amplitude: 0.17, period: 5.9, phase: 2.1, swayPeriod: 23.7 },
    tv: { position: [-1.6, 0.49, 2.45], rotationY: -0.578, scale: 0.62 },
    settle: [16.83, 9.13, 12.79],
    inbound: {
      // Climbs over the top and dives. Shortest and sharpest of the three —
      // this island is the busy, energetic one, and power3.out front-loads the
      // speed so it reads as a drop rather than a glide.
      via: [SKY_CAMERA, [5.5, 14.0, 18.0], [12.0, 10.0, 13.0], [14.0, 7.5, 10.2], [16.83, 9.13, 12.79]],
      look: [SKY_TARGET, [4.0, 2.0, -0.5], [7.6, 0.0, -2.0], [9.28, -0.9, -2.55]],
      duration: 1.6,
      ease: 'power3.out',
    },
    outbound: {
      via: [[16.83, 9.13, 12.79], [10.0, 10.0, 14.0], [4.0, 12.0, 19.0], SKY_CAMERA],
      look: [[9.28, -0.9, -2.55], [3.0, 0.8, -0.5], SKY_TARGET],
      duration: 1.4,
      ease: 'power2.inOut',
    },
  },
  {
    id: 'contact',
    index: 2,
    label: 'Journal',
    section: 'Writing',
    blurb: 'Writing about the things that did not fit anywhere else.',
    accent: '#315DA8',
    scale: 2.06,
    labelHeight: 4.2,
    position: [-1.74, 4, -9.86],
    radius: 5.43,
    deck: { y: 0.45, radius: 2.5 },
    idle: { amplitude: 0.28, period: 9.7, phase: 4.3, swayPeriod: 15.3 },
    tv: { position: [1.15, 0.45, 1.45], rotationY: 0.669, scale: 0.58 },
    settle: [5.69, 12.14, 1.11],
    inbound: {
      // The calm one. Almost a straight glide with a slow rise, longest
      // duration and a symmetrical ease — arriving, not diving.
      via: [SKY_CAMERA, [6.4, 14.2, 14.5], [8.6, 12.6, 6.4], [5.69, 12.14, 1.11]],
      look: [SKY_TARGET, [0.0, 3.0, -4.0], [-1.74, 4, -9.86]],
      duration: 2.0,
      ease: 'power2.inOut',
    },
    outbound: {
      via: [[5.69, 12.14, 1.11], [-2.6, 11.0, 7.0], [-1.6, 11.5, 15.0], SKY_CAMERA],
      look: [[-1.74, 4, -9.86], [-0.5, 1.8, -2.0], SKY_TARGET],
      duration: 1.5,
      ease: 'power2.inOut',
    },
  },
]

export function getIsland(id: IslandId): IslandDef {
  const island = ISLANDS.find((i) => i.id === id)
  if (!island) throw new Error(`Unknown island: ${id}`)
  return island
}


/* ----------------------------------------------------------------------------
   Where a television's picture actually is in the world, and where a camera has
   to stand to be square to it.

   Written with plain trigonometry rather than three's Vector3 so this module
   stays free of three imports. The HTML panels and the nav read this file and
   ship in the shell chunk that paints before the 3D runtime loads; a single
   `import { Vector3 }` here drags all of three.js into that chunk.

   Rotation about Y in three maps (x, y, z) to (x cos a + z sin a, y, -x sin a
   + z cos a), which is where the signs below come from.
   -------------------------------------------------------------------------- */

/** Offset of the screen from the television's own origin. Mirrors the constant
    in three/primitives/Television.tsx; the two must agree. */
export const SCREEN_LOCAL_OFFSET: Vec3 = [0, 0.68, 0.58]

/** Fraction of the viewport height the picture should fill on arrival. */
const SCREEN_FRAME_FRACTION = 0.34

export interface TvPose {
  /** World position of the centre of the picture. */
  screen: Vec3
  /** Unit vector pointing out of the screen, toward the viewer. */
  forward: Vec3
  /** Height of the picture in world units, after every scale is applied. */
  screenHeight: number
}

export function tvWorldPose(island: IslandDef): TvPose {
  const a = island.tv.rotationY
  const cos = Math.cos(a)
  const sin = Math.sin(a)

  const [ox, oy, oz] = SCREEN_LOCAL_OFFSET
  const t = island.tv.scale
  // Screen offset, scaled by the television and then rotated to face outward.
  const rx = ox * t * cos + oz * t * sin
  const rz = -ox * t * sin + oz * t * cos

  const [tx, ty, tz] = island.tv.position
  const s = island.scale
  const [ix, iy, iz] = island.position

  return {
    screen: [ix + (tx + rx) * s, iy + (ty + oy * t) * s, iz + (tz + rz) * s],
    forward: [sin, 0, cos],
    screenHeight: 0.86 * t * s,
  }
}

/**
 * Camera pose that frames the picture square on. `fovDegrees` comes from the
 * responsive framing, so a phone (which widens the lens) automatically stands
 * closer rather than ending up with a stamp-sized television.
 */
export function tvSettlePose(
  island: IslandDef,
  fovDegrees: number,
  frameFraction = SCREEN_FRAME_FRACTION,
): { position: Vec3; target: Vec3 } {
  const pose = tvWorldPose(island)
  const halfFov = (fovDegrees * Math.PI) / 180 / 2
  const distance = pose.screenHeight / frameFraction / (2 * Math.tan(halfFov))

  return {
    position: [
      pose.screen[0] + pose.forward[0] * distance,
      // A small rise, so the shot looks very slightly down at the set the way
      // a person standing in front of one would, rather than dead level.
      pose.screen[1] + distance * 0.16,
      pose.screen[2] + pose.forward[2] * distance,
    ],
    target: pose.screen,
  }
}
