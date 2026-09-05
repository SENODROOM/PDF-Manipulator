import { useEffect, useRef, useState } from 'react'
import { cx } from '../lib/cx.js'
import { revokeUrls } from '../lib/pdf.js'
import { Button } from './Button.jsx'
import { Icon } from './Icon.jsx'
import styles from './PreviewDialog.module.css'

const PREVIEW_WIDTH = 1100

/** Full-size look at one page, with keyboard navigation and a remove toggle. */
export function PreviewDialog({
  pageNumber,
  pageCount,
  isRemoved,
  renderPreview,
  onClose,
  onNavigate,
  onToggle,
}) {
  const [image, setImage] = useState(null)
  const dialogRef = useRef(null)
  const returnFocusRef = useRef(null)

  // Render the requested page; abandon the result if the page changed meanwhile.
  useEffect(() => {
    let cancelled = false
    setImage(null)

    renderPreview(pageNumber, PREVIEW_WIDTH)
      .then((result) => {
        if (!result) return
        if (cancelled) {
          revokeUrls([result.url])
          return
        }
        setImage(result)
      })
      .catch((err) => console.error('Preview failed', err))

    return () => {
      cancelled = true
    }
  }, [pageNumber, renderPreview])

  // Revoke the URL once it leaves the screen.
  useEffect(() => () => revokeUrls([image?.url]), [image])

  useEffect(() => {
    returnFocusRef.current = document.activeElement
    dialogRef.current?.focus()

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowLeft') onNavigate(-1)
      else if (event.key === 'ArrowRight') onNavigate(1)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      returnFocusRef.current?.focus?.()
    }
  }, [onClose, onNavigate])

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`Page ${pageNumber} of ${pageCount}`}
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className={styles.bar}>
          <span className={styles.counter}>
            Page {pageNumber} / {pageCount}
          </span>
          <div className={styles.spacer} />
          <Button
            size="sm"
            variant={isRemoved ? 'danger' : 'outline'}
            icon={isRemoved ? 'undo' : 'trash'}
            onClick={() => onToggle(pageNumber)}
          >
            {isRemoved ? 'Keep this page' : 'Mark for removal'}
          </Button>
          <Button
            size="icon"
            variant="subtle"
            icon="close"
            onClick={onClose}
            title="Close preview (Esc)"
            aria-label="Close preview"
          />
        </div>

        <div className={styles.stage}>
          <button
            type="button"
            className={cx(styles.nav, styles.prev)}
            onClick={() => onNavigate(-1)}
            disabled={pageNumber <= 1}
            aria-label="Previous page"
          >
            <Icon name="chevronLeft" size={18} />
          </button>

          {image ? (
            <img
              className={cx(styles.sheet, isRemoved && styles.removedSheet)}
              src={image.url}
              alt={`Page ${pageNumber}`}
            />
          ) : (
            <div className={styles.loading}>Rendering page {pageNumber}…</div>
          )}

          <button
            type="button"
            className={cx(styles.nav, styles.next)}
            onClick={() => onNavigate(1)}
            disabled={pageNumber >= pageCount}
            aria-label="Next page"
          >
            <Icon name="chevronRight" size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
