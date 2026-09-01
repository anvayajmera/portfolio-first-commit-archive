/* ============================================================================
   WORLD — the lazy-loaded 3D bundle boundary.
   ----------------------------------------------------------------------------
   three, drei and every scene component sit behind this module so they land in
   a separate chunk. The shell (React, the loader, the design system) is ~15 kB
   gzipped and paints immediately; the ~340 kB of 3D runtime streams in behind
   the branded loading screen instead of blocking it (§9 — the loader has to be
   on screen BEFORE the thing it is covering for).
   ========================================================================= */

import type { QualitySettings, QualityTier } from '../lib/quality'
import Stage from './Stage'
import Scene from './Scene'

export default function World({
  quality,
  onDowngrade,
  onReady,
}: {
  quality: QualitySettings
  onDowngrade: (next: QualityTier) => void
  onReady: () => void
}) {
  return (
    <Stage quality={quality}>
      <Scene quality={quality} onDowngrade={onDowngrade} onReady={onReady} />
    </Stage>
  )
}
