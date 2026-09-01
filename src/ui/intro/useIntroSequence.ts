/* ============================================================================
   INTRO SEQUENCE — Beats 1 to 4, as one GSAP timeline (spec §1).
   ----------------------------------------------------------------------------
   Timings match the spec's storyboard exactly:

     0.00 – 2.50  Beat 1  title card fades and scales in, then holds
     2.50 – 4.50  Beat 2  the dissolve: 2D crossfades into extruded 3D,
                          sky rises behind it, flash cue at the swap
     4.50 – 6.50  Beat 3  wordmark travels to the top-right corner
     6.50 – 9.00  Beat 4  camera pulls back; clouds and islands arrive

   WHY THE ROTATION IS HELD AT ZERO THROUGH BEAT 2. The extruded wordmark
   starts dead face-on, so its silhouette is identical to the flat text and the
   crossfade has nothing to give it away. It only begins to turn once the
   crossfade has finished, in Beat 3 — that turn is the reveal. Rotating during
   the fade would smear two visibly different shapes together and the whole
   trick collapses. Wordmark3D reads `wordmarkPlacement` for the rotation, and
   that value does not move until 4.5s.

   The timeline writes into the shared frame object (read in useFrame) and
   straight onto the two DOM nodes. GSAP is ticked from inside R3F's loop (see
   GsapBridge), so both stay on the same clock.
   ========================================================================= */

import { useEffect } from 'react'
import gsap from 'gsap'
import { useExperience } from '../../lib/experience'
import { prefersReducedMotion } from '../../lib/motion'

export interface IntroTargets {
  title: HTMLElement | null
  flash: HTMLElement | null
}

export function useIntroSequence(ready: boolean, targets: IntroTargets) {
  const { setPhase, frame, markIntroDone, introDone } = useExperience()

  useEffect(() => {
    if (!ready || introDone) return

    const f = frame.current
    const { title } = targets
    const reduced = prefersReducedMotion()

    /* Reduced motion opens on the same shot, just without the travel: the name
       and the sky fade up together and the world crossfades in. Same beats,
       same order, no camera move to sit through. */
    if (reduced) {
      setPhase('title')
      const tl = gsap.timeline()
      if (title) gsap.set(title, { opacity: 0 })
      f.skyPresence = 1
      f.wordmarkTyped = 1
      tl.to(f, { wordmarkPresence: 1, duration: 0.4 }, 0)
      tl.call(() => setPhase('reveal'), undefined, 1.25)
      tl.to(
        f,
        { cameraReveal: 1, cloudPresence: 1, islandPresence: 1, wordmarkPlacement: 1, duration: 0.45 },
        1.25,
      )
      tl.call(
        () => {
          setPhase('sky')
          markIntroDone()
        },
        undefined,
        1.75,
      )
      return () => {
        tl.kill()
      }
    }

    /* ---- Full sequence ---------------------------------------------------
       Opens ON the daylight sky with the extruded name already standing in it.
       No dark title card: the previous version spent its first seconds on a
       near-black screen, which on a first visit is indistinguishable from a
       page that has not loaded.

       Then the name visibly travels to the top left and stays there as the
       site's identity, and only once it has arrived do the islands appear. The
       order matters: name, then place. Doing both at once gives the eye two
       things to follow and it tracks neither.
       ------------------------------------------------------------------- */
    setPhase('title')
    const tl = gsap.timeline()

    if (title) gsap.set(title, { opacity: 0 })

    // Sky is already there; the name types itself into it.
    f.skyPresence = 1
    f.wordmarkTyped = 0
    tl.to(f, { wordmarkPresence: 1, duration: 0.5, ease: 'power2.out' }, 0.2)
    /* steps() rather than a smooth ramp: typing happens in whole characters,
       and easing between them produces a value that spends most of its time
       between letters, which the rounding then turns into an uneven stutter. */
    tl.to(
      f,
      { wordmarkTyped: 1, duration: 1.35, ease: `steps(${'Anvay Ajmera'.length})` },
      0.35,
    )
    tl.to(f, { cloudPresence: 1, duration: 1.4, ease: 'power1.out' }, 0.2)

    // A beat to read it centred, then the journey to the corner.
    tl.call(() => setPhase('relocate'), undefined, 2.15)
    tl.to(f, { wordmarkPlacement: 1, duration: 1.6, ease: 'power2.inOut' }, 2.15)

    // The world opens as the name settles, overlapping just enough that it
    // reads as one continuous move rather than two separate events.
    tl.call(() => setPhase('reveal'), undefined, 3.05)
    tl.to(f, { cameraReveal: 1, duration: 1.9, ease: 'power2.inOut' }, 3.05)
    tl.to(f, { islandPresence: 1, duration: 1.5, ease: 'power2.out' }, 3.4)

    tl.call(
      () => {
        setPhase('sky')
        markIntroDone()
      },
      undefined,
      5.05,
    )

    return () => {
      tl.kill()
    }
    // targets is a stable object from the caller's refs; intentionally not a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, introDone])
}
