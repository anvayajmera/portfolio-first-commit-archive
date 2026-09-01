/* ============================================================================
   LOADER — spec §9. Branded, in the site's own palette, and it gates the intro.
   ----------------------------------------------------------------------------
   Beat 1 must not begin until assets are genuinely ready, or the title card
   plays and then stutters as the typeface geometry and fonts land. Readiness
   here means three things at once:

     · the 3D chunk has loaded AND its Suspense boundary resolved, which means
       the extruded typeface JSON has parsed (signalled by Scene on mount)
     · document.fonts.ready has resolved (the HTML title must be Space Grotesk
       at the moment it is measured, or the 3D wordmark inherits a rect that
       was measured against a fallback face and the dissolve misaligns)
     · a minimum on-screen time has elapsed, so a fast connection gets a
       deliberate beat rather than a flash of loader
   ========================================================================= */

import { useEffect, useRef, useState } from 'react'
import styles from './Loader.module.css'

const MIN_VISIBLE_MS = 900

export default function Loader({
  sceneReady,
  fontsReady,
  onReady,
}: {
  sceneReady: boolean
  fontsReady: boolean
  onReady: () => void
}) {
  const [done, setDone] = useState(false)
  const [hidden, setHidden] = useState(false)
  const startedAt = useRef(performance.now())
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    if (!fontsReady || !sceneReady) return

    const elapsed = performance.now() - startedAt.current
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed)
    const id = window.setTimeout(() => {
      firedRef.current = true
      setDone(true)
      onReady()
      window.setTimeout(() => setHidden(true), 800)
    }, wait)
    return () => window.clearTimeout(id)
  }, [fontsReady, sceneReady, onReady])

  if (hidden) return null

  /* Coarse but honest: each real milestone moves the bar. Dropping drei's
     useProgress keeps the whole 3D bundle out of the loader's chunk, which is
     the entire point of showing a loader at all. */
  const pct = done ? 100 : 12 + (fontsReady ? 34 : 0) + (sceneReady ? 54 : 0)

  return (
    <div className={styles.root} data-done={done} role="status" aria-live="polite">
      <div className={styles.inner}>
        <svg className={styles.mark} viewBox="0 0 32 32" aria-hidden="true">
          <path className={styles.markStroke} d="M16 5 L6.5 26 L11.4 26 L16 16.2 L20.6 26 L25.5 26 Z" />
        </svg>
        <div className={styles.track}>
          <div className={styles.bar} style={{ width: `${done ? 100 : pct}%` }} />
        </div>
        <p className={styles.label}>{done ? 'Ready' : `Loading ${pct}%`}</p>
      </div>
    </div>
  )
}
