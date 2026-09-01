/* ============================================================================
   OVERLAY — the entire HTML layer (spec §5).
   ----------------------------------------------------------------------------
   The canvas is the stage; every readable word is here. The layer itself is
   pointer-events: none so clicks pass through to the islands, and each
   interactive child opts back in.

   The <h1> is the Beat 1 title card AND the document's heading. It stays in
   the DOM at opacity 0 for the rest of the session rather than unmounting: the
   3D wordmark that replaces it is inside an aria-hidden canvas, so if this
   element left, the page would have no accessible name and nothing for a
   crawler to read.
   ========================================================================= */

import { useEffect, useMemo, useRef } from 'react'
import { ArrowLeft, Grid2X2, Map } from 'lucide-react'
import { useExperience } from '../lib/experience'
import { ISLANDS, getIsland } from '../lib/islands'
import { measureTitle } from '../lib/titleMetrics'
import { SITE } from '../content/site.content'
import { useIntroSequence } from './intro/useIntroSequence'
import PortfolioPanel from './panels/PortfolioPanel'
import ProjectsPanel from './panels/ProjectsPanel'
import ContactPanel from './panels/ContactPanel'
import SoundControl from './SoundControl'
import ThemeToggle from './ThemeToggle'
import styles from './Overlay.module.css'

export default function Overlay({ ready }: { ready: boolean }) {
  const { phase, activeIsland, flightIsland, hoveredIsland, enterIsland, returnToSky, theme } =
    useExperience()

  const titleRef = useRef<HTMLHeadingElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const returnFocusTo = useRef<string | null>(null)

  const targets = useMemo(
    () => ({
      get title() {
        return titleRef.current
      },
      get flash() {
        return flashRef.current
      },
    }),
    [],
  )

  useIntroSequence(ready, targets)

  /* The 3D wordmark sizes itself from this element's measured rect, so it has
     to be measured after fonts settle and again on every resize (§ the
     dissolve depends on the two being pixel-aligned). */
  useEffect(() => {
    const measure = () => measureTitle(titleRef.current)
    measure()
    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
    fonts?.ready.then(measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [ready])

  /* Publish the theme on the document so the HTML chrome can restyle itself.
     Everything drawn over the sky (the identity block, the island name labels,
     the map prompt) is dark ink chosen to sit on daylight blue, and would be
     close to invisible against the night sky. The 3D layer reads the theme
     from the frame object; the CSS reads it from here. */
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  /* Escape leaves an island. ProjectsPanel captures Escape first when its
     detail view is open, so one press backs out one level. */
  useEffect(() => {
    if (phase !== 'island') return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') returnToSky()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, returnToSky])

  /* Focus returns to whichever nav control launched the trip. */
  useEffect(() => {
    if (phase !== 'sky' || !returnFocusTo.current) return
    document.getElementById(returnFocusTo.current)?.focus()
    returnFocusTo.current = null
  }, [phase])

  const inIsland = phase === 'island'
  const chromeVisible =
    phase === 'sky' || phase === 'inbound' || phase === 'island' || phase === 'outbound'

  /* Mounted for the whole trip — inbound, parked, and outbound — but only
     `open` while parked. Two reasons: a CSS transition does not run on initial
     mount, so a panel that appears already-open pops rather than slides; and
     keeping it mounted through the outbound flight lets it animate away
     instead of vanishing the instant the camera starts moving. */
  const panelIsland = flightIsland ?? activeIsland
  const hovered = hoveredIsland ? getIsland(hoveredIsland) : null

  return (
    <>
      <div ref={flashRef} className={styles.flash} aria-hidden="true" />

      <div className={styles.layer}>
        <div className={styles.titleWrap}>
          <h1 ref={titleRef} className={styles.title}>
            {SITE.name}
          </h1>
        </div>
        {/* Always present for assistive tech and crawlers, regardless of beat. */}
        <p className="u-visually-hidden">{SITE.tagline}</p>

        <div
          className={styles.chrome}
          data-visible={chromeVisible}
          data-panel={Boolean(panelIsland)}
        >
          {/* The name itself is the extruded 3D wordmark parked in this
              corner, so only the line underneath it lives in HTML. Rendering
              the name here as well put two versions of it in the same corner
              fighting each other. */}
          <div className={styles.identity}>
            <span>{SITE.tagline}</span>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              id="all-projects"
              className={styles.projectsShortcut}
              onClick={() => {
                returnFocusTo.current = 'all-projects'
                enterIsland('projects')
              }}
              disabled={activeIsland === 'projects'}
            >
              <Grid2X2 size={16} aria-hidden="true" />
              <span>All projects</span>
            </button>
            <ThemeToggle />
            <SoundControl />
          </div>

          <p className={styles.mapPrompt} data-visible={phase === 'sky'}>
            Pick a place to land
          </p>

          <button
            type="button"
            className={styles.back}
            data-visible={inIsland}
            onClick={returnToSky}
            tabIndex={inIsland ? 0 : -1}
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Back to world
          </button>

          <p className={styles.hint} data-visible={Boolean(hovered) && phase === 'sky'} aria-hidden="true">
            {hovered ? hovered.blurb : ''}
          </p>

          <nav className={styles.nav} aria-label="Destinations">
            <button
              type="button"
              id="nav-sky"
              className={styles.navItem}
              data-home="true"
              aria-current={phase === 'sky'}
              onClick={returnToSky}
              disabled={phase === 'sky'}
            >
              <Map size={16} aria-hidden="true" />
              <span className={styles.navCopy}>
                <strong>World</strong>
                <small>All islands</small>
              </span>
            </button>

            {ISLANDS.map((island) => (
              <button
                key={island.id}
                type="button"
                id={`nav-${island.id}`}
                className={styles.navItem}
                aria-current={activeIsland === island.id}
                aria-label={`${island.label}. ${island.blurb}`}
                onClick={() => {
                  returnFocusTo.current = `nav-${island.id}`
                  enterIsland(island.id)
                }}
                style={{ color: activeIsland === island.id ? island.accent : undefined }}
              >
                <span className={styles.navNumber} aria-hidden="true">0{island.index + 1}</span>
                <span className={styles.navCopy}>
                  <strong>{island.label}</strong>
                  <small>{island.section}</small>
                </span>
              </button>
            ))}
          </nav>
        </div>

        {panelIsland === 'portfolio' && <PortfolioPanel open={inIsland} />}
        {panelIsland === 'projects' && <ProjectsPanel open={inIsland} />}
        {panelIsland === 'contact' && <ContactPanel open={inIsland} />}
      </div>
    </>
  )
}
