import { useCallback, useEffect, useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const STAMP_ROTATIONS = [-7, 5, -4, 8, -6, 3, -9, 6]

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function App() {
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [originalBytes, setOriginalBytes] = useState(null)
  const [pages, setPages] = useState([]) // { pageNumber, thumbnail }
  const [removed, setRemoved] = useState(() => new Set())
  const [status, setStatus] = useState('idle') // idle | reading | ready | exporting
  const [renderProgress, setRenderProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  const resetAll = useCallback(() => {
    setFileName('')
    setFileSize(0)
    setOriginalBytes(null)
    setPages([])
    setRemoved(new Set())
    setStatus('idle')
    setRenderProgress({ done: 0, total: 0 })
    setError('')
  }, [])

  const loadFile = useCallback(async (file) => {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('That file is not a PDF. Choose a .pdf file to continue.')
      return
    }
    setError('')
    setStatus('reading')
    setFileName(file.name)
    setFileSize(file.size)
    setRemoved(new Set())

    const buffer = await file.arrayBuffer()
    setOriginalBytes(buffer)

    try {
      const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) })
      const pdf = await loadingTask.promise
      const total = pdf.numPages
      setRenderProgress({ done: 0, total })

      const rendered = []
      for (let i = 1; i <= total; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 0.45 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')
        await page.render({ canvasContext: ctx, viewport }).promise
        rendered.push({ pageNumber: i, thumbnail: canvas.toDataURL('image/png') })
        setRenderProgress({ done: i, total })
      }
      setPages(rendered)
      setStatus('ready')
    } catch (err) {
      console.error(err)
      setError("Couldn't read that PDF. It may be corrupted or password-protected.")
      setStatus('idle')
    }
  }, [])

  const onInputChange = (e) => {
    const file = e.target.files?.[0]
    loadFile(file)
  }

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      loadFile(file)
    },
    [loadFile],
  )

  const toggleRemoved = (pageNumber) => {
    setRemoved((prev) => {
      const next = new Set(prev)
      if (next.has(pageNumber)) next.delete(pageNumber)
      else next.add(pageNumber)
      return next
    })
  }

  const markFirst = () => {
    if (pages.length === 0) return
    setRemoved((prev) => new Set(prev).add(pages[0].pageNumber))
  }

  const markLast = () => {
    if (pages.length === 0) return
    setRemoved((prev) => new Set(prev).add(pages[pages.length - 1].pageNumber))
  }

  const clearMarks = () => setRemoved(new Set())

  const keptCount = pages.length - removed.size

  const downloadEdited = async () => {
    if (!originalBytes || removed.size === pages.length) return
    setStatus('exporting')
    try {
      const srcDoc = await PDFDocument.load(originalBytes)
      const outDoc = await PDFDocument.create()
      const indicesToKeep = pages
        .map((p) => p.pageNumber - 1)
        .filter((idx) => !removed.has(idx + 1))

      const copied = await outDoc.copyPages(srcDoc, indicesToKeep)
      copied.forEach((p) => outDoc.addPage(p))

      const outBytes = await outDoc.save()
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const base = fileName.replace(/\.pdf$/i, '') || 'document'
      a.href = url
      a.download = `${base}-edited.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      setError('Something went wrong while building the new PDF. Try again.')
    } finally {
      setStatus('ready')
    }
  }

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-mark">
          <span className="masthead-glyph">✂︎</span>
        </div>
        <div>
          <h1>Leaflet</h1>
          <p className="tagline">Trim pages out of any PDF, right in your browser.</p>
        </div>
      </header>

      <main className="layout">
        <aside className="rail">
          {status === 'idle' && (
            <div
              className={`dropzone ${isDragging ? 'dropzone-active' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
              }}
            >
              <div className="dropzone-icon">＋</div>
              <p className="dropzone-title">Drop a PDF here</p>
              <p className="dropzone-sub">or click to browse your files</p>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={onInputChange}
                hidden
              />
            </div>
          )}

          {status === 'reading' && (
            <div className="panel">
              <p className="panel-label">Opening file</p>
              <p className="file-name">{fileName}</p>
              {renderProgress.total > 0 ? (
                <>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${(renderProgress.done / renderProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="progress-label">
                    Rendering page {renderProgress.done} of {renderProgress.total}
                  </p>
                </>
              ) : (
                <p className="progress-label">Reading document…</p>
              )}
            </div>
          )}

          {(status === 'ready' || status === 'exporting') && (
            <div className="panel">
              <p className="panel-label">Current file</p>
              <p className="file-name">{fileName}</p>
              <p className="file-meta">{formatBytes(fileSize)} · {pages.length} pages</p>

              <div className="divider" />

              <p className="panel-label">Quick picks</p>
              <div className="quick-actions">
                <button className="btn btn-line" onClick={markFirst} disabled={pages.length === 0}>
                  Mark first page
                </button>
                <button className="btn btn-line" onClick={markLast} disabled={pages.length === 0}>
                  Mark last page
                </button>
                <button className="btn btn-ghost" onClick={clearMarks} disabled={removed.size === 0}>
                  Clear all marks
                </button>
              </div>

              <div className="divider" />

              <div className="tally">
                <div className="tally-row">
                  <span>Kept</span>
                  <span className="tally-num tally-keep">{keptCount}</span>
                </div>
                <div className="tally-row">
                  <span>Marked for removal</span>
                  <span className="tally-num tally-remove">{removed.size}</span>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={downloadEdited}
                disabled={status === 'exporting' || keptCount === 0}
              >
                {status === 'exporting' ? 'Building PDF…' : 'Download edited PDF'}
              </button>
              {keptCount === 0 && (
                <p className="warn">Every page is marked — unmark at least one to export.</p>
              )}

              <button className="btn btn-text" onClick={resetAll}>
                Start over with a new file
              </button>
            </div>
          )}

          {error && <p className="error">{error}</p>}
        </aside>

        <section className="board">
          {status === 'idle' && !error && (
            <div className="empty-state">
              <p>Upload a PDF to see every page laid out here.</p>
              <p className="empty-sub">Click any page to mark it for deletion — nothing is changed until you download.</p>
            </div>
          )}

          {pages.length > 0 && (
            <div className="sheet-grid">
              {pages.map((p, i) => {
                const isRemoved = removed.has(p.pageNumber)
                const rotation = STAMP_ROTATIONS[i % STAMP_ROTATIONS.length]
                return (
                  <button
                    key={p.pageNumber}
                    className={`sheet ${isRemoved ? 'sheet-removed' : ''}`}
                    onClick={() => toggleRemoved(p.pageNumber)}
                    title={isRemoved ? 'Click to keep this page' : 'Click to remove this page'}
                  >
                    <img src={p.thumbnail} alt={`Page ${p.pageNumber}`} />
                    <span className="sheet-number">{p.pageNumber}</span>
                    {isRemoved && (
                      <span className="stamp" style={{ transform: `rotate(${rotation}deg)` }}>
                        Removed
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
