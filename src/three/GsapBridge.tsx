/* ============================================================================
   GSAP ↔ R3F TICKING
   ----------------------------------------------------------------------------
   By default GSAP runs its own requestAnimationFrame loop and R3F runs
   another. Two loops means two clocks, and a camera tween can land a frame
   ahead of or behind the render that draws it — micro-jitter in exactly the
   slow, deliberate camera moves this site is built on. So GSAP's root is
   detached from its ticker and driven from inside R3F's frame loop instead.

   Time is ACCUMULATED from wherever the root already is, rather than passed
   R3F's `clock.elapsedTime` directly. The clock starts at zero when the canvas
   mounts, but GSAP's root has been running since page load, so handing it
   elapsedTime would wind the root backwards — and a root timeline that jumps
   back in time re-fires callbacks and re-renders tweens that had finished.

   Priority -1000 so it runs before every other useFrame subscriber: R3F sorts
   subscribers ascending by priority, and only a POSITIVE priority takes over
   rendering, so a large negative is safe.
   ========================================================================= */

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'

export default function GsapBridge() {
  const time = useRef(0)

  useEffect(() => {
    time.current = gsap.globalTimeline.time()
    gsap.ticker.remove(gsap.updateRoot)
    return () => {
      gsap.ticker.add(gsap.updateRoot)
    }
  }, [])

  useFrame((_, delta) => {
    // Clamp so a backgrounded tab does not fast-forward the whole intro on
    // return.
    time.current += Math.min(delta, 0.1)
    gsap.updateRoot(time.current)
  }, -1000)

  return null
}
