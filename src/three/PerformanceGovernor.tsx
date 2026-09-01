/* ============================================================================
   PERFORMANCE GOVERNOR — spec §3 makes 50fps on a mid-range phone a hard
   constraint, so the scene has to be able to notice it is missing and react.
   ----------------------------------------------------------------------------
   Static device detection alone is not trustworthy: Safari does not expose
   deviceMemory, and a flagship phone and a budget one report the same core
   count. So detection only picks a starting tier, and this measures what
   actually happens.

   Design notes:
   · A warm-up window is skipped. The first second is shader compilation and
     texture upload, and judging the device on that would demote everyone.
   · Downgrades are ONE-WAY. Recovering upward would rebuild cloud instances
     and the shadow map, which itself costs a hitch — so a device that dipped
     once would oscillate between tiers forever, which is worse than sitting
     on the lower one.
   · The median frame time is used rather than the mean: a single 200ms GC
     pause should not demote a device that is otherwise comfortable.
   ========================================================================= */

import { useCallback, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { nextTierDown, type QualityTier } from '../lib/quality'

/** 50fps is the target; demote if the median frame is slower than this. */
const BUDGET_MS = 1000 / 48

const WARMUP_MS = 1200
const WINDOW = 90
/** Consecutive bad windows before acting, so one rough patch is not enough. */
const STRIKES = 2

export default function PerformanceGovernor({
  tier,
  onDowngrade,
}: {
  tier: QualityTier
  onDowngrade: (next: QualityTier) => void
}) {
  const samples = useRef<number[]>([])
  const strikes = useRef(0)
  const startedAt = useRef(0)
  const settled = useRef(false)

  useEffect(() => {
    startedAt.current = performance.now()
    samples.current = []
    strikes.current = 0
  }, [])

  const evaluate = useCallback(() => {
    const sorted = [...samples.current].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    samples.current = []

    if (median <= BUDGET_MS) {
      strikes.current = 0
      return
    }

    strikes.current += 1
    if (strikes.current < STRIKES) return

    const next = nextTierDown(tier)
    strikes.current = 0
    if (!next) {
      // Already at the floor; stop measuring rather than burning frames on it.
      settled.current = true
      return
    }
    onDowngrade(next)
  }, [tier, onDowngrade])

  useFrame((_, delta) => {
    if (settled.current) return
    if (performance.now() - startedAt.current < WARMUP_MS) return

    samples.current.push(delta * 1000)
    if (samples.current.length >= WINDOW) evaluate()
  })

  return null
}
