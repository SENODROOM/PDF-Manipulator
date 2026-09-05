import { cx } from '../lib/cx.js'
import { formatBytes, formatRanges, pluralize } from '../lib/format.js'
import { Button } from './Button.jsx'
import { Dropzone } from './Dropzone.jsx'
import { Icon } from './Icon.jsx'
import styles from './Sidebar.module.css'

function Guide() {
  return (
    <div className={styles.guide}>
      <p className={styles.guideTitle}>How it works</p>
      <ol className={styles.steps}>
        <li>Every page is rendered as a thumbnail — on this device, never uploaded.</li>
        <li>
          Click pages to mark them for removal — hold{' '}
          <span className={styles.kbd}>Shift</span> to mark a whole run at once.
        </li>
        <li>Download a fresh PDF with the marked pages dropped. The original is untouched.</li>
      </ol>
    </div>
  )
}

function FileCard({ fileName, fileSize, pageCount, rendered, isLoading }) {
  const percent = pageCount > 0 ? Math.round((rendered / pageCount) * 100) : 0

  return (
    <div className={styles.card}>
      <div className={styles.fileHead}>
        <span className={styles.fileIcon}>
          <Icon name="file" size={17} />
        </span>
        <div>
          <p className={styles.fileName} title={fileName}>
            {fileName}
          </p>
          <p className={styles.fileMeta}>
            {formatBytes(fileSize)}
            {pageCount > 0 && ` · ${pluralize(pageCount, 'page')}`}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className={styles.progress}>
          <div
            className={styles.track}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pageCount > 0 ? percent : undefined}
            aria-label="Rendering pages"
          >
            <div className={styles.fill} style={{ width: `${pageCount > 0 ? percent : 8}%` }} />
          </div>
          <p className={styles.progressLabel} aria-live="polite">
            {pageCount > 0
              ? `Rendering page ${Math.min(rendered + 1, pageCount)} of ${pageCount}`
              : 'Reading document…'}
          </p>
        </div>
      )}
    </div>
  )
}

export function Sidebar({ editor, isDragging }) {
  const {
    phase,
    fileName,
    fileSize,
    pageCount,
    pages,
    removedNumbers,
    keptCount,
    canUndo,
    isExporting,
    isLoading,
    load,
    reset,
    markFirst,
    markLast,
    invert,
    clearMarks,
    undo,
    exportPdf,
  } = editor

  if (phase === 'idle') {
    return (
      <aside className={styles.rail}>
        <Dropzone isDragging={isDragging} onFile={load} />
        <Guide />
      </aside>
    )
  }

  const removedCount = removedNumbers.length
  const nothingKept = pageCount > 0 && keptCount === 0

  return (
    <aside className={styles.rail}>
      <FileCard
        fileName={fileName}
        fileSize={fileSize}
        pageCount={pageCount}
        rendered={pages.length}
        isLoading={isLoading}
      />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span>Quick picks</span>
          <Button
            variant="subtle"
            size="sm"
            icon="undo"
            onClick={undo}
            disabled={!canUndo}
            title="Undo last change (Ctrl+Z)"
          >
            Undo
          </Button>
        </div>

        <div className={styles.picks}>
          <Button size="sm" icon="first" onClick={markFirst} disabled={pageCount === 0}>
            First page
          </Button>
          <Button size="sm" icon="last" onClick={markLast} disabled={pageCount === 0}>
            Last page
          </Button>
          <Button size="sm" icon="swap" onClick={invert} disabled={pageCount === 0}>
            Invert
          </Button>
          <Button size="sm" icon="trash" onClick={clearMarks} disabled={removedCount === 0}>
            Clear marks
          </Button>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span>Result</span>
        </div>

        <div className={styles.tally}>
          <div className={cx(styles.stat, styles.statKept)}>
            <div className={styles.statValue}>{keptCount}</div>
            <div className={styles.statLabel}>kept</div>
          </div>
          <div className={cx(styles.stat, styles.statRemoved)}>
            <div className={styles.statValue}>{removedCount}</div>
            <div className={styles.statLabel}>removed</div>
          </div>
        </div>

        {removedCount > 0 && (
          <p className={styles.ranges}>
            Dropping <span className={styles.rangeList}>{formatRanges(removedNumbers)}</span>
          </p>
        )}
      </div>

      <div className={styles.export}>
        <Button
          variant="solid"
          icon="download"
          full
          onClick={exportPdf}
          disabled={isExporting || nothingKept || pageCount === 0}
        >
          {isExporting ? 'Building PDF…' : 'Download edited PDF'}
        </Button>
        {nothingKept && <p className={styles.warn}>Unmark at least one page to export.</p>}
      </div>

      <div className={styles.footer}>
        <Button variant="text" onClick={reset}>
          Start over with a new file
        </Button>
      </div>
    </aside>
  )
}
