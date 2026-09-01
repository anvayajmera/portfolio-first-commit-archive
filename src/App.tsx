/* ============================================================================
   APP — composes the three layers: canvas stage, HTML overlay, loader.
   ----------------------------------------------------------------------------
   The 3D world is behind a lazy boundary so the branded loader is on screen
   before the ~340 kB of three.js starts arriving, rather than after it.
   ========================================================================= */

import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { ExperienceProvider } from './lib/experience'
import { QUALITY, detectTier, type QualityTier } from './lib/quality'
import Overlay from './ui/Overlay'
import Loader from './ui/Loader'

const World = lazy(() => import('./three/World'))

export default function App() {
  const [tier, setTier] = useState<QualityTier>(() => detectTier())
  const [sceneReady, setSceneReady] = useState(false)
  const [fontsReady, setFontsReady] = useState(false)
  const [ready, setReady] = useState(false)

  const quality = QUALITY[tier]

  /* Fonts have to be settled before the HTML title is measured — the 3D
     wordmark sizes itself from that rect, and a rect measured against a
     fallback face would misalign the Beat 2 dissolve. */
  useEffect(() => {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
    if (!fonts) {
      setFontsReady(true)
      return
    }
    let cancelled = false
    fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleDowngrade = useCallback((next: QualityTier) => {
    setTier((current) => (current === next ? current : next))
  }, [])

  const handleSceneReady = useCallback(() => setSceneReady(true), [])
  const handleLoaderDone = useCallback(() => setReady(true), [])

  return (
    <ExperienceProvider>
      <a className="u-skip-link" href="#content">
        Skip to content
      </a>

      <Suspense fallback={null}>
        <World quality={quality} onDowngrade={handleDowngrade} onReady={handleSceneReady} />
      </Suspense>

      <main id="content" tabIndex={-1}>
        <Overlay ready={ready} />
      </main>

      <Loader sceneReady={sceneReady} fontsReady={fontsReady} onReady={handleLoaderDone} />
    </ExperienceProvider>
  )
}
