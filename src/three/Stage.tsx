/* ============================================================================
   STAGE — the <Canvas> and its renderer configuration.
   ----------------------------------------------------------------------------
   Renderer decisions and why:

   dpr             From the quality tier. Capped at 2 even on "high": a 3x
                   phone renders 2.25x the fragments of a 2x one for a
                   difference nobody can see at arm's length, and fill rate is
                   the binding constraint (§3).

   antialias       Kept on. Flat-shaded low-poly is nothing but hard silhouette
                   edges, and aliasing on those is the most obvious "cheap
                   WebGL" tell — worth more than the fragments a higher dpr
                   would buy.

   alpha false     The sky shader is fully opaque, so there is no reason to pay
                   for an alpha channel or for compositing against the page.

   NeutralTone-    Not ACES. ACES is a film look: it desaturates highlights and
   Mapping         warms the frame, which drags the brand blue off #3B82F6 and
                   breaks it against the HTML panels sitting right next to it.
                   Khronos PBR Neutral exists to preserve authored colour,
                   which is what a site with a brand palette needs.

   NO POST-PROCESSING. §1 asks for "a brief chromatic/depth cue (very subtle
   bloom or DOF)" at the dissolve. Implemented, but not with an EffectComposer:
   that means a second render target, a full-screen blur and ~40 kB gzipped, a
   permanent per-frame cost carried for one moment of the session, and it is
   the single most likely thing to break the 50fps phone budget. Instead the
   cue is a CSS radial flash (Overlay), and the glow that would have come from
   bloom is additive halo geometry on the emissive parts (forms.tsx, Beacon).
   Same perceptual beat, ~zero cost, and it degrades cleanly on the low tier.
   ========================================================================= */

import { Suspense, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { NeutralToneMapping } from 'three'
import { BASE_FOV } from '../lib/camera'
import type { QualitySettings } from '../lib/quality'
import styles from './Stage.module.css'

export default function Stage({
  quality,
  children,
}: {
  quality: QualitySettings
  children: ReactNode
}) {
  return (
    <div className={styles.host} aria-hidden="true">
      <Canvas
        shadows="soft"
        dpr={quality.dpr}
        gl={{
          antialias: true,
          alpha: false,
          stencil: false,
          depth: true,
          powerPreference: 'high-performance',
          toneMapping: NeutralToneMapping,
          toneMappingExposure: 1.02,
        }}
        camera={{ fov: BASE_FOV, near: 0.1, far: 400, position: [0, 1, 8] }}
      >
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  )
}
