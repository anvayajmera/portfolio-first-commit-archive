/* ============================================================================
   QUALITY TIERS — spec §3 makes 50fps on a 2021 mid-range phone a hard
   constraint, so the scene has to be able to make itself cheaper.
   ----------------------------------------------------------------------------
   Two mechanisms:

   1. A static guess at load, from whatever the device will admit to. This is
      unreliable on its own — Safari lies about deviceMemory, and a flagship
      phone and a budget one report the same core count — so it only picks a
      starting point.
   2. A runtime governor that measures actual frame time and drops a tier if
      the device is not keeping up. That is the one that does the real work.

   Downgrades are one-way within a session. Oscillating between tiers is worse
   than sitting on the lower one: every swap rebuilds cloud instances and the
   shadow map, which itself causes a hitch.
   ========================================================================= */

export type QualityTier = 'high' | 'medium' | 'low'

export interface QualitySettings {
  tier: QualityTier
  dpr: [number, number]
  shadows: boolean
  shadowMapSize: number
  /** Cloud billboard layers, and sprites per layer. */
  cloudLayers: number
  cloudsPerLayer: number
  /** Radial/height segments on island lathes and rocks. */
  detail: number
  /** Additive halo sprites that stand in for a bloom pass. */
  glowSprites: boolean
}

export const QUALITY: Record<QualityTier, QualitySettings> = {
  high: {
    tier: 'high',
    dpr: [1, 2],
    shadows: true,
    shadowMapSize: 2048,
    cloudLayers: 6,
    cloudsPerLayer: 18,
    detail: 1,
    glowSprites: true,
  },
  medium: {
    tier: 'medium',
    dpr: [1, 1.6],
    shadows: true,
    shadowMapSize: 1024,
    cloudLayers: 4,
    cloudsPerLayer: 10,
    detail: 1,
    glowSprites: true,
  },
  low: {
    tier: 'low',
    dpr: [1, 1.25],
    // Shadows are the single most expensive thing here: a full extra depth
    // pass over every island every frame. The hemisphere fill keeps the
    // faceting readable without them, so this is the first thing to go.
    shadows: false,
    shadowMapSize: 512,
    cloudLayers: 3,
    cloudsPerLayer: 7,
    detail: 0,
    glowSprites: false,
  },
}

export function detectTier(): QualityTier {
  if (typeof window === 'undefined') return 'high'

  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 4
  const memory = nav.deviceMemory ?? 4
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const dpr = window.devicePixelRatio || 1

  // A coarse pointer plus a high pixel ratio is the phone signature: lots of
  // fragments to fill, comparatively little GPU to fill them with.
  const phoneLike = coarse && dpr >= 2

  if (cores <= 4 || memory <= 2) return 'low'
  if (phoneLike && cores <= 6) return 'medium'
  if (phoneLike) return 'medium'
  if (cores <= 6) return 'medium'
  return 'high'
}

const ORDER: QualityTier[] = ['high', 'medium', 'low']

export function nextTierDown(tier: QualityTier): QualityTier | null {
  const i = ORDER.indexOf(tier)
  return i < ORDER.length - 1 ? ORDER[i + 1] : null
}
