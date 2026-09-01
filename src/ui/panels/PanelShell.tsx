/* Shared frosted shell. Owns the open/close transition, focus management and
   the accent variable; each island supplies its own interior (spec §4/§5). */

import { useEffect, useRef, type ReactNode } from 'react'
import styles from './Panel.module.css'

export interface PanelShellProps {
  open: boolean
  accent: string
  eyebrow: string
  heading: string
  lede: string
  headingId: string
  children?: ReactNode
  /** Rendered instead of the header + children when a sub-view is showing. */
  replaceWith?: ReactNode
  wide?: boolean
}

export default function PanelShell({
  open,
  accent,
  eyebrow,
  heading,
  lede,
  headingId,
  children,
  replaceWith,
  wide = false,
}: PanelShellProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  /* Focus lands on the heading when the panel opens, so a screen reader
     announces where it has arrived and keyboard tabbing starts inside the
     panel rather than back at the top of the document (§5). */
  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => headingRef.current?.focus(), 120)
    return () => window.clearTimeout(id)
  }, [open])

  return (
    <div className={styles.shell} data-wide={wide}>
      {/* The set around the picture. Antennas, cabinet and legs are drawn in
          CSS around the panel rather than left to the 3D television behind it:
          once the panel covers most of the frame the real set is hidden, and
          without this the content reads as a plain modal that happened to
          appear after a camera move. */}
      <div className={styles.antenna} aria-hidden="true">
        <span className={styles.antennaLeft} />
        <span className={styles.antennaRight} />
        <span className={styles.antennaBase} />
      </div>
      <section
        className={styles.panel}
        data-open={open}
        data-wide={wide}
        aria-labelledby={headingId}
        aria-hidden={!open}
        inert={!open}
        style={{ ['--panel-accent' as string]: accent }}
      >
        {replaceWith ?? (
          <>
            <header className={styles.header}>
              <span className={styles.accentRule} aria-hidden="true" />
              <p className={styles.eyebrow}>{eyebrow}</p>
              <h2 id={headingId} className={styles.heading} ref={headingRef} tabIndex={-1}>
                {heading}
              </h2>
              <p className={styles.lede}>{lede}</p>
            </header>
            {children}
          </>
        )}
      </section>
      <div className={styles.legs} aria-hidden="true">
        <span />
        <span />
      </div>
    </div>
  )
}
