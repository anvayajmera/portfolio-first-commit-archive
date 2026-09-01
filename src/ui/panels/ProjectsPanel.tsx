import { useEffect, useState, type ComponentType } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Bot, FileText, PanelsTopLeft, ScanLine, Trophy, type LucideProps } from 'lucide-react'
import PanelShell from './PanelShell'
import styles from './Panel.module.css'
import { AWARDS, PROJECTS, WORK_PANEL, type Project } from '../../content/site.content'
import { getIsland } from '../../lib/islands'

const island = getIsland('projects')

const ICONS: Record<Project['icon'], ComponentType<LucideProps>> = {
  detector: ScanLine,
  robot: Bot,
  software: PanelsTopLeft,
}

function ProjectMark({ project, compact = false }: { project: Project; compact?: boolean }) {
  const Icon = ICONS[project.icon]
  return (
    <span
      className={compact ? styles.projectMarkSmall : styles.projectMark}
      style={{ backgroundColor: project.accent }}
      aria-hidden="true"
    >
      <Icon strokeWidth={1.45} />
    </span>
  )
}

export default function ProjectsPanel({ open }: { open: boolean }) {
  const [selected, setSelected] = useState(PROJECTS[0].id)

  useEffect(() => {
    if (open) setSelected((current) => current || PROJECTS[0].id)
  }, [open])

  return (
    <PanelShell
      open={open}
      accent={island.accent}
      eyebrow={WORK_PANEL.eyebrow}
      heading={WORK_PANEL.heading}
      lede={WORK_PANEL.lede}
      headingId="panel-projects-heading"
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
          <p className={styles.projectCount}>{PROJECTS.length} builds</p>
          <Tabs.List className={`${styles.projectList} u-scroll`} aria-label="Choose a project">
            {PROJECTS.map((project, index) => (
              <Tabs.Trigger key={project.id} value={project.id} className={styles.projectTrigger}>
                <span className={styles.projectNumber}>{String(index + 1).padStart(2, '0')}</span>
                <ProjectMark project={project} compact />
                <span className={styles.projectTriggerCopy}>
                  <strong>{project.title}</strong>
                  <span>{project.category}</span>
                </span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* The record, kept beside the builds rather than on its own island.
              Awards are context for the work, not a destination of their own. */}
          <section className={styles.awards} aria-label="Awards and recognition">
            <h3>
              <Trophy size={14} aria-hidden="true" /> Recognition
            </h3>
            <ul>
              {AWARDS.map((award) => (
                <li key={award.title}>
                  <span className={styles.awardYear}>{award.year}</span>
                  <span className={styles.awardCopy}>
                    <strong>{award.title}</strong>
                    <small>{award.detail}</small>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <div className={styles.projectDetails}>
          {PROJECTS.map((project) => (
            <Tabs.Content key={project.id} value={project.id} className={`${styles.projectContent} u-scroll`}>
              <article>
                <header className={styles.projectHero}>
                  <ProjectMark project={project} />
                  <div className={styles.projectHeroCopy}>
                    <p>{project.category} · {project.year}</p>
                    <h3>{project.title}</h3>
                    <span>{project.status}</span>
                  </div>
                </header>

                <p className={styles.projectSummary}>{project.summary}</p>

                <section className={styles.projectQuestion}>
                  <span>Starting question</span>
                  <h4>{project.question}</h4>
                </section>

                <div className={styles.projectSections}>
                  {project.sections.map((section) => (
                    <section key={section.label}>
                      <h4>{section.label}</h4>
                      <p>{section.text}</p>
                    </section>
                  ))}
                </div>

                <ul className={styles.tags} aria-label="Project topics">
                  {project.tags.map((tag) => <li key={tag} className={styles.tag}>{tag}</li>)}
                </ul>

                <div className={styles.attachments}>
                  {project.attachments.map((attachment) => (
                    attachment.href ? (
                      <a key={attachment.label} href={attachment.href} className={styles.attachment}>
                        <FileText size={18} aria-hidden="true" />
                        {attachment.label}
                      </a>
                    ) : (
                      <div key={attachment.label} className={styles.attachment} data-disabled="true">
                        <FileText size={18} aria-hidden="true" />
                        {attachment.label}
                      </div>
                    )
                  ))}
                </div>
              </article>
            </Tabs.Content>
          ))}
        </div>
      </Tabs.Root>
    </PanelShell>
  )
}
