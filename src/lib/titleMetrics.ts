/* ============================================================================
   TITLE METRICS — the handshake that makes the 2D→3D dissolve invisible.
   ----------------------------------------------------------------------------
   Beat 2 only works if the extruded wordmark appears at EXACTLY the screen
   position and size the HTML text occupied. Hard-coding a 3D size to match a
   CSS `clamp()` would hold at one viewport and drift at every other.

   So the HTML title measures itself and publishes its rect here, in normalised
   device coordinates, and the 3D wordmark sizes itself to match. A plain
   mutable object rather than context: it is written on mount and on resize,
   read inside useFrame, and nothing should re-render when it changes.
   ========================================================================= */

export interface TitleMetrics {
  /** Text width as a fraction of viewport width, 0..1. */
  widthFraction: number
  /** Centre of the text in NDC (-1..1, y up). */
  centerNdcX: number
  centerNdcY: number
  measured: boolean
}

export const titleMetrics: TitleMetrics = {
  widthFraction: 0.62,
  centerNdcX: 0,
  centerNdcY: 0,
  measured: false,
}

export function measureTitle(el: HTMLElement | null): void {
  if (!el) return
  const rect = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (!rect.width || !vw || !vh) return

  titleMetrics.widthFraction = rect.width / vw
  titleMetrics.centerNdcX = ((rect.left + rect.width / 2) / vw) * 2 - 1
  titleMetrics.centerNdcY = -(((rect.top + rect.height / 2) / vh) * 2 - 1)
  titleMetrics.measured = true
}
