import { pluralize } from '../lib/format.js'
import { Button } from './Button.jsx'
import styles from './ActionBar.module.css'

export function ActionBar({ keptCount, removedCount, isExporting, disabled, onExport }) {
  return (
    <div className={styles.bar}>
      <p className={styles.counts}>
        <span className={styles.kept}>{pluralize(keptCount, 'page')}</span> kept
        {removedCount > 0 && (
          <>
            {' · '}
            <span className={styles.removedCount}>{removedCount}</span> removed
          </>
        )}
      </p>
      <Button variant="solid" icon="download" onClick={onExport} disabled={disabled || isExporting}>
        {isExporting ? 'Building…' : 'Download'}
      </Button>
    </div>
  )
}
