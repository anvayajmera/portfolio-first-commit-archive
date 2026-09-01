/* ============================================================================
   SOUND CONTROL - one button.
   ----------------------------------------------------------------------------
   One looping track, on by default, muted with the button or with M.

   See the comment on `enabled` for what "on by default" can actually mean
   given autoplay policy, and the comment on FADE_OUT_MS in lib/audio.ts for
   why stopping is nearly instant while starting is not.
   ========================================================================= */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { MusicPlayer, TRACK } from '../lib/audio'
import styles from './SoundControl.module.css'

export default function SoundControl() {
  const playerRef = useRef<MusicPlayer | null>(null)
  /* Music is ON by default. `enabled` is the intent; `audible` is whether the
     browser has let it be heard yet. They are separate on purpose, because the
     previous version conflated them and the button reported "off" the whole
     time the track was in fact already playing. */
  const [enabled, setEnabled] = useState(true)
  const [audible, setAudible] = useState(false)

  const ensurePlayer = useCallback(() => {
    if (!playerRef.current) playerRef.current = new MusicPlayer()
    return playerRef.current
  }, [])

  /* Two-step start.

     Step one, at load: start muted playback so the file is running and
     buffered instead of waiting behind a cold network request.

     Step two: unmute on the first interaction of any kind. The listener stays
     attached until an unlock actually succeeds. Detaching after a rejected
     first attempt was the bug that made visitors mute and unmute manually. */
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const player = ensurePlayer()
    player.load(TRACK)

    // Buffer and begin the loop muted. Audible playback is requested directly
    // inside the first trusted gesture below, where browser policy allows it.
    void player.startSilently()

    const onGesture = () => {
      if (cancelled) return
      void player.tryUnmute().then((ok) => {
        if (!ok || cancelled) return
        setAudible(true)
        detach()
      })
    }
    function detach() {
      window.removeEventListener('pointerdown', onGesture, true)
      window.removeEventListener('keydown', onGesture, true)
      window.removeEventListener('touchstart', onGesture, true)
      window.removeEventListener('wheel', onGesture, true)
    }
    window.addEventListener('pointerdown', onGesture, { capture: true, passive: true })
    window.addEventListener('keydown', onGesture, true)
    window.addEventListener('touchstart', onGesture, { capture: true, passive: true })
    window.addEventListener('wheel', onGesture, { capture: true, passive: true })

    return () => {
      cancelled = true
      detach()
    }
  }, [enabled, ensurePlayer])

  const toggle = useCallback(() => {
    const player = ensurePlayer()
    if (enabled) {
      player.pause()
      setEnabled(false)
      setAudible(false)
      return
    }
    player.load(TRACK)
    setEnabled(true)
    // This call begins inside the button click itself. Waiting for the effect
    // would lose the trusted gesture and put us back behind autoplay policy.
    void player.tryUnmute().then((ok) => setAudible(ok))
  }, [enabled, ensurePlayer])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'm' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  useEffect(
    () => () => {
      playerRef.current?.dispose()
      playerRef.current = null
    },
    [],
  )

  return (
    <div className={styles.player}>
      <button
        type="button"
        className={styles.toggle}
        /* Reports INTENT, not whether sound has escaped the autoplay policy
           yet. Showing a muted icon while the track is already playing and one
           click from being audible is just wrong. */
        data-playing={audible}
        aria-pressed={enabled}
        aria-label={`${enabled ? 'Mute' : 'Play'} music. ${TRACK.title} by ${TRACK.artist}. Keyboard shortcut M.`}
        title={`${TRACK.title} by ${TRACK.artist} (${TRACK.license})`}
        onClick={toggle}
      >
        {enabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
        <span className={styles.toggleLabel}>{enabled ? 'Music' : 'Muted'}</span>
        <span className={styles.bars} aria-hidden="true"><i /><i /><i /></span>
      </button>
      {enabled && !audible && (
        <span className="u-visually-hidden" role="status">
          Music will start when you interact with the page.
        </span>
      )}
    </div>
  )
}
