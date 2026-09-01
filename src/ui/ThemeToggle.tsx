/* ============================================================================
   THEME TOGGLE - day or night.
   ----------------------------------------------------------------------------
   The button reports the CURRENT state and switches on press, rather than
   naming the state it would move to. Both conventions exist and both confuse
   somebody, so the label says where you are and aria-pressed says whether
   night is on, which is the pair screen readers handle unambiguously.
   ========================================================================= */

import { Moon, Sun } from 'lucide-react'
import { useExperience } from '../lib/experience'
import styles from './ThemeToggle.module.css'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useExperience()
  const night = theme === 'night'

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggleTheme}
      aria-pressed={night}
      aria-label={night ? 'Night. Switch to day.' : 'Day. Switch to night.'}
      title={night ? 'Switch to day' : 'Switch to night'}
    >
      {night ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
      <span className={styles.label}>{night ? 'Night' : 'Day'}</span>
    </button>
  )
}
