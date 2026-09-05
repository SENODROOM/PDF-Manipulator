import { Icon } from './Icon.jsx'
import styles from './DropOverlay.module.css'

/** Shown while a file is dragged over the window. Purely presentational. */
export function DropOverlay({ replacing }) {
  return (
    <div className={styles.overlay} aria-hidden="true">
      <div className={styles.panel}>
        <span className={styles.icon}>
          <Icon name="plus" size={24} />
        </span>
        <p className={styles.title}>Drop to open</p>
        <p className={styles.sub}>
          {replacing ? 'This replaces the document you have open.' : 'Your PDF stays on this device.'}
        </p>
      </div>
    </div>
  )
}
