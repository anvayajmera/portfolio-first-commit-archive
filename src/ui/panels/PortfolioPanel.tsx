/* ============================================================================
   IDENTITY PANEL - hero, skills, gallery, and how to reach him.
   ----------------------------------------------------------------------------
   Everything a visitor needs to answer "who is this and how do I contact them"
   without leaving the panel. Contact used to be its own island, which meant a
   reader who liked what they saw had to fly somewhere else to act on it. The
   links now sit at the bottom of the page they were convinced on.
   ========================================================================= */

import { Mail } from 'lucide-react'
import PanelShell from './PanelShell'
import styles from './Panel.module.css'
import { IDENTITY, PLACEHOLDER_COPY } from '../../content/site.content'
import { getIsland } from '../../lib/islands'

const island = getIsland('portfolio')

export default function PortfolioPanel({ open }: { open: boolean }) {
  return (
    <PanelShell
      open={open}
      accent={island.accent}
      eyebrow={IDENTITY.eyebrow}
      heading={IDENTITY.heading}
      lede={IDENTITY.lede}
      headingId="panel-identity-heading"
      wide
    >
      <div className={`${styles.scroller} u-scroll`}>
        <div className={styles.identityGrid}>
          <div className={styles.body}>
            {IDENTITY.body.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          <section className={styles.skills} aria-label="Skills">
            {IDENTITY.skills.map((group) => (
              <div key={group.label} className={styles.skillGroup}>
                <h3>{group.label}</h3>
                <ul>
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </div>

        <section className={styles.gallery} aria-label="Photographs">
          {IDENTITY.gallery.map((shot) => (
            <figure key={shot.caption} className={styles.galleryItem}>
              {shot.src ? (
                <img src={shot.src} alt={shot.caption} />
              ) : (
                <div className={styles.gallerySlot} aria-hidden="true" />
              )}
              <figcaption>{shot.caption}</figcaption>
            </figure>
          ))}
        </section>

        <section className={styles.contactBlock} aria-label="Contact">
          <p className={styles.contactLede}>
            <Mail size={17} aria-hidden="true" />
            {IDENTITY.contactLede}
          </p>
          <ul className={styles.links}>
            {IDENTITY.links.map((link) => (
              <li key={link.label}>
                {link.href ? (
                  <a
                    className={styles.link}
                    href={link.href}
                    {...(link.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                  >
                    <span className={styles.linkLabel}>{link.label}</span>
                    <span className={styles.linkValue}>{link.value}</span>
                  </a>
                ) : (
                  <span className={styles.link} data-disabled="true">
                    <span className={styles.linkLabel}>{link.label}</span>
                    <span className={styles.linkValue}>{link.value}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        {PLACEHOLDER_COPY && <p className={styles.placeholderChip}>Draft copy</p>}
      </div>
    </PanelShell>
  )
}
