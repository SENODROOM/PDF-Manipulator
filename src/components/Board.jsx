import { pluralize } from '../lib/format.js'
import { Icon } from './Icon.jsx'
import { PageCard, PageSkeleton } from './PageCard.jsx'
import styles from './Board.module.css'

function EmptyState() {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyArt} aria-hidden="true">
        <div className={styles.emptySheet} />
        <div className={styles.emptySheet} />
        <div className={styles.emptySheet}>
          <Icon name="scissors" size={30} />
        </div>
      </div>
      <p className={styles.emptyTitle}>No document open</p>
      <p className={styles.emptySub}>
        Drop a PDF anywhere on this page and every page will be laid out here. Nothing is changed
        until you download.
      </p>
    </div>
  )
}

export function Board({ editor, thumbSize, onThumbSize, onPreview }) {
  const { phase, pages, pageCount, removed, removedNumbers, togglePage } = editor

  if (phase === 'idle') {
    return (
      <section className={styles.board}>
        <EmptyState />
      </section>
    )
  }

  const pending = Math.max(0, pageCount - pages.length)
  const removedCount = removedNumbers.length

  return (
    <section className={styles.board} aria-label="Pages">
      <div className={styles.toolbar}>
        <p className={styles.summary} aria-live="polite">
          <strong>{pageCount > 0 ? pluralize(pageCount, 'page') : 'Reading…'}</strong>
          {removedCount > 0 && (
            <>
              {' · '}
              <span className={styles.marked}>{removedCount} marked for removal</span>
            </>
          )}
        </p>

        <div className={styles.spacer} />

        <div className={styles.sizer}>
          <span className={styles.small} aria-hidden="true" />
          <input
            type="range"
            min={120}
            max={280}
            step={8}
            value={thumbSize}
            onChange={(event) => onThumbSize(event.target.value)}
            aria-label="Thumbnail size"
          />
          <span className={styles.large} aria-hidden="true" />
        </div>
      </div>

      {pages.length > 0 && (
        <p className={styles.hint}>
          Click a page to mark it for removal · Shift-click to mark a run
        </p>
      )}

      <div className={styles.grid} style={{ '--thumb': `${thumbSize}px` }} role="group" aria-label="Document pages">
        {pages.map((page) => (
          <PageCard
            key={page.number}
            page={page}
            isRemoved={removed.has(page.number)}
            onToggle={togglePage}
            onPreview={onPreview}
          />
        ))}
        {Array.from({ length: pending }, (_, i) => (
          <PageSkeleton key={`skeleton-${pages.length + i + 1}`} number={pages.length + i + 1} />
        ))}
      </div>
    </section>
  )
}
