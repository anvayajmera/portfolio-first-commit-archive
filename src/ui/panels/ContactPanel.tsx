/* ============================================================================
   JOURNAL PANEL - the writing.
   ----------------------------------------------------------------------------
   Same master-detail shape as the work panel, deliberately. A reader who has
   learned how one island works should not have to learn a second interaction
   to read the next. The difference is in the typography: entries get a wider
   measure and looser leading, because these are meant to be read rather than
   scanned.
   ========================================================================= */

import { useEffect, useRef, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import PanelShell from './PanelShell'
import styles from './Panel.module.css'
import { JOURNAL, JOURNAL_PANEL, PLACEHOLDER_COPY } from '../../content/site.content'
import { getIsland } from '../../lib/islands'

const island = getIsland('contact')

export default function ContactPanel({ open }: { open: boolean }) {
  const [selected, setSelected] = useState(JOURNAL[0].id)
  const readerRef = useRef<HTMLDivElement>(null)

  /* Scroll the reader back to the top when a different entry is chosen.
     Landing halfway down a new piece because the last one was long is a small
     thing that feels broken every single time. */
  useEffect(() => {
    readerRef.current?.scrollTo({ top: 0 })
  }, [selected])

  useEffect(() => {
    if (!open) setSelected(JOURNAL[0].id)
  }, [open])

  return (
    <PanelShell
      open={open}
      accent={island.accent}
      eyebrow={JOURNAL_PANEL.eyebrow}
      heading={JOURNAL_PANEL.heading}
      lede={JOURNAL_PANEL.lede}
      headingId="panel-journal-heading"
      wide
    >
      <Tabs.Root
        className={styles.projectBrowser}
        value={selected}
        onValueChange={setSelected}
        orientation="vertical"
        activationMode="manual"
      >
        <aside className={styles.projectIndex}>
          <p className={styles.projectCount}>{JOURNAL.length} entries</p>
          <Tabs.List className={`${styles.projectList} u-scroll`} aria-label="Choose an entry">
            {JOURNAL.map((entry) => (
              <Tabs.Trigger key={entry.id} value={entry.id} className={styles.journalTrigger}>
                <span className={styles.journalKind}>{entry.kind}</span>
                <strong>{entry.title}</strong>
                <span className={styles.journalDate}>{entry.date}</span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </aside>

        <div className={styles.projectDetails}>
          {JOURNAL.map((entry) => (
            <Tabs.Content
              key={entry.id}
              value={entry.id}
              className={`${styles.projectContent} u-scroll`}
              ref={entry.id === selected ? readerRef : undefined}
            >
              <article className={styles.reader}>
                <p className={styles.readerMeta}>
                  {entry.kind} · {entry.date}
                </p>
                <h3>{entry.title}</h3>
                <p className={styles.readerStandfirst}>{entry.standfirst}</p>
                {entry.body.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </article>
            </Tabs.Content>
          ))}
        </div>
      </Tabs.Root>

      {PLACEHOLDER_COPY && <p className={styles.placeholderChip}>Draft copy</p>}
    </PanelShell>
  )
}
