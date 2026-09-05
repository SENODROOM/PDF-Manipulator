import { memo } from 'react'
import { cx } from '../lib/cx.js'
import { Icon } from './Icon.jsx'
import styles from './PageCard.module.css'

/** Hand-stamped look: a stable, slightly irregular tilt per page. */
const TILTS = [-7, 5, -4, 8, -6, 3, -9, 6]

export const PageCard = memo(function PageCard({ page, isRemoved, onToggle, onPreview }) {
  const { number, url, width, height, failed } = page
  const tilt = TILTS[(number - 1) % TILTS.length]
  const ratio = width && height ? width / height : undefined

  return (
    <div
      className={cx(styles.card, isRemoved && styles.removed)}
      style={ratio ? { '--page-ratio': ratio } : undefined}
    >
      {/* Sibling of the toggle rather than a child of it — buttons can't nest. */}
      <button
        type="button"
        className={styles.zoom}
        title={`Preview page ${number}`}
        aria-label={`Preview page ${number}`}
        onClick={() => onPreview(number)}
      >
        <Icon name="expand" size={13} />
      </button>

      <button
        type="button"
        className={styles.toggle}
        aria-pressed={isRemoved}
        aria-label={`Page ${number}${isRemoved ? ', marked for removal' : ''}`}
        onClick={(event) => onToggle(number, event.shiftKey)}
      >
        <span className={styles.frame}>
          {failed ? (
            <span className={styles.failed}>Preview unavailable</span>
          ) : (
            <img src={url} alt="" loading="lazy" decoding="async" draggable={false} />
          )}
          {isRemoved && (
            <span className={styles.stamp} style={{ rotate: `${tilt}deg` }}>
              Removed
            </span>
          )}
        </span>

        <span className={styles.footer}>
          <span className={styles.tick}>
            <Icon name="check" size={10} strokeWidth="2.6" />
          </span>
          {number}
        </span>
      </button>
    </div>
  )
})

export function PageSkeleton({ number }) {
  return (
    <div className={cx(styles.card, styles.skeleton)} aria-hidden="true">
      <span className={cx(styles.frame, styles.skeletonFrame)} />
      <span className={styles.footer}>{number}</span>
    </div>
  )
}
