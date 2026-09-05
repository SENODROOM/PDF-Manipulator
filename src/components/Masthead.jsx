import { Button } from './Button.jsx'
import { Icon } from './Icon.jsx'
import styles from './Masthead.module.css'

export function Masthead({ theme, onToggleTheme }) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <header className={styles.masthead}>
      <span className={styles.mark}>
        <Icon name="scissors" size={20} />
      </span>

      <div>
        <h1 className={styles.wordmark}>Leaflet</h1>
        <p className={styles.tagline}>Trim pages out of any PDF, right in your browser.</p>
      </div>

      <div className={styles.spacer} />

      <span className={styles.badge}>
        <Icon name="check" size={13} />
        Nothing is uploaded
      </span>

      <Button
        variant="subtle"
        size="icon"
        icon={theme === 'dark' ? 'sun' : 'moon'}
        onClick={onToggleTheme}
        title={`Switch to ${nextTheme} theme`}
        aria-label={`Switch to ${nextTheme} theme`}
      />
    </header>
  )
}
