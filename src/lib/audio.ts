/* ============================================================================
   MUSIC - real tracks, streamed from files.
   ----------------------------------------------------------------------------
   This used to synthesise lo-fi in the browser with Tone.js: chord arrays, a
   membrane kick, a noise hat. It was a lot of code and it sounded like a MIDI
   demo, because that is what generated music sounds like without samples,
   swing that was actually performed, and tape saturation. Lo-fi in particular
   is almost entirely about the texture of the recording, which is the one
   thing a synth graph cannot fake.

   So: actual recordings, played back with an HTMLAudioElement.

   Why a plain audio element rather than Howler or the Web Audio API. There is
   one background track playing at a time, and the element streams it
   progressively, decodes it off the main thread, handles range requests and
   Media Session for free, and never has to hold the decoded buffer in memory.
   Web Audio would mean downloading and decoding the whole file before a note
   plays, which for a 2 MB track is a several second wait for no benefit.

   LICENSING. These tracks are Creative Commons BY-NC-ND 4.0. That allows this
   use (a personal, non-commercial site) and requires visible credit, which is
   why `artist` and `license` are rendered in the picker rather than buried
   here. Do not remove that credit, and swap the files if the site ever becomes
   commercial. Replacing a track means dropping an mp3 into public/audio and
   editing one entry below.
   ========================================================================= */

export interface Track {
  id: string
  title: string
  artist: string
  /** Rendered in the picker to satisfy the attribution requirement. */
  license: string
  licenseUrl: string
  sourceUrl: string
  src: string
  /** Seconds, for the picker. */
  duration: number
}

/* One track, on loop. An earlier version shipped three and a picker, which
   made a background detail into a decision the visitor had to make. A single
   piece of music that loops is what a room sounds like; a playlist with a
   dropdown is a media player sitting on top of a portfolio. */
export const TRACK: Track = {
  id: 'final-entry',
  title: 'Final Entry',
  artist: 'GeoThology feat. Lizzy Price',
  license: 'CC BY-NC-ND 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
  sourceUrl: 'https://archive.org/details/2-hi-fi-diary',
  src: '/audio/final-entry.mp3',
  duration: 135,
}

/** Background music should sit under the experience, not host it. */
const TARGET_VOLUME = 0.34

/* Fade lengths, in milliseconds. The fade OUT is deliberately much shorter
   than the fade in.

   The first version used 550ms both ways, and pausing felt broken: you press
   the button, the music keeps going for over half a second, so you press it
   again, which the toggle now reads as "play". The music never stops and the
   control looks dead. A stop has to be effectively immediate to feel like a
   stop; a start can afford to be gentle. */
const FADE_IN_MS = 420
const FADE_OUT_MS = 140

export class MusicPlayer {
  private el: HTMLAudioElement
  private raf: number | null = null
  private loaded = false

  constructor() {
    this.el = new Audio()
    this.el.preload = 'none'
    this.el.volume = 0
    this.el.loop = true
    this.el.setAttribute('data-role', 'ambient-music')
    /* Attached to the document rather than left detached. A detached element
       plays, but it is invisible to the browser's media session, to devtools,
       and to anything trying to verify what the page is doing. */
    this.el.style.display = 'none'
    if (typeof document !== 'undefined') document.body.appendChild(this.el)
  }

  get playing(): boolean {
    return !this.el.paused
  }

  load(track: Track): void {
    if (this.loaded) return
    this.loaded = true
    this.el.src = track.src
    this.el.preload = 'auto'
  }

  /**
   * Muted playback, which every browser permits without a gesture. Always try
   * this FIRST: it is the call that is guaranteed to succeed, and once the
   * element is playing everything else is just a volume change.
   */
  async startSilently(): Promise<boolean> {
    try {
      this.el.muted = true
      this.el.volume = TARGET_VOLUME
      await this.el.play()
      return true
    } catch {
      return false
    }
  }

  /**
   * Attempt to become audible. Returns false if the browser refused, having
   * put the element back exactly as it found it.
   *
   * The self-correction matters. Chrome's response to an unmute without a
   * user gesture is to PAUSE the element, so a naive implementation both fails
   * to make sound and stops the music that was already playing. This checks
   * whether that happened and restores muted playback if so, which is why the
   * track keeps running while it waits for a gesture instead of dying on the
   * first attempt.
   */
  async tryUnmute(): Promise<boolean> {
    this.el.muted = false
    try {
      if (this.el.paused) await this.el.play()
      if (this.el.paused) throw new Error('refused')
      this.ramp(TARGET_VOLUME, FADE_IN_MS)
      return true
    } catch {
      this.el.muted = true
      void this.el.play().catch(() => {})
      return false
    }
  }

  pause(): void {
    this.ramp(0, FADE_OUT_MS, () => this.el.pause())
  }

  private ramp(target: number, duration: number, done?: () => void): void {
    if (this.raf !== null) cancelAnimationFrame(this.raf)
    const from = this.el.volume
    const start = performance.now()

    const step = () => {
      const t = Math.min(1, (performance.now() - start) / duration)
      this.el.volume = Math.min(1, Math.max(0, from + (target - from) * t))
      if (t < 1) {
        this.raf = requestAnimationFrame(step)
        return
      }
      this.raf = null
      done?.()
    }
    // rAF rather than setInterval: it is frame-aligned with everything else on
    // the page and it stops on its own in a backgrounded tab.
    this.raf = requestAnimationFrame(step)
  }

  dispose(): void {
    if (this.raf !== null) cancelAnimationFrame(this.raf)
    this.el.pause()
    this.el.src = ''
    this.el.remove()
  }
}
