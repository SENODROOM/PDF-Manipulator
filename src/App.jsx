import { useCallback, useEffect, useRef, useState } from 'react'
import { ActionBar } from './components/ActionBar.jsx'
import { Board } from './components/Board.jsx'
import { DropOverlay } from './components/DropOverlay.jsx'
import { Masthead } from './components/Masthead.jsx'
import { PreviewDialog } from './components/PreviewDialog.jsx'
import { Sidebar } from './components/Sidebar.jsx'
import { ToastStack } from './components/Toast.jsx'
import { useFileDrop } from './hooks/useFileDrop.js'
import { usePdfEditor } from './hooks/usePdfEditor.js'
import { useStoredNumber } from './hooks/useStoredNumber.js'
import { useTheme } from './hooks/useTheme.js'
import { pluralize } from './lib/format.js'
import { prefetchPdfEngine } from './lib/pdf.js'
import styles from './App.module.css'

export default function App() {
  const editor = usePdfEditor()
  const { resolved: theme, toggle: toggleTheme } = useTheme()
  const isDragging = useFileDrop(editor.load)
  const [thumbSize, setThumbSize] = useStoredNumber('leaflet:thumb', 168, { min: 120, max: 280 })

  const [previewPage, setPreviewPage] = useState(null)
  const [toasts, setToasts] = useState([])
  const toastId = useRef(0)

  // Warm the (code-split) render engine after first paint.
  useEffect(prefetchPdfEngine, [])

  const pushToast = useCallback((toast) => {
    toastId.current += 1
    setToasts((current) => [...current.slice(-2), { id: toastId.current, ...toast }])
  }, [])

  const dismissToast = useCallback(
    (id) => setToasts((current) => current.filter((toast) => toast.id !== id)),
    [],
  )

  // Errors live in the editor's state; mirror them into the toast stack once.
  const { error, dismissError } = editor
  useEffect(() => {
    if (!error) return
    pushToast({ tone: 'error', title: error })
    dismissError()
  }, [error, dismissError, pushToast])

  // Keep the preview in bounds as the document changes underneath it.
  const { pageCount } = editor
  useEffect(() => {
    setPreviewPage((current) => (current != null && current > pageCount ? null : current))
  }, [pageCount])

  const handleExport = useCallback(async () => {
    const result = await editor.exportPdf()
    if (result) {
      pushToast({
        title: 'Downloaded',
        detail: `${result.name} · ${pluralize(result.pageCount, 'page')}`,
        timeout: 6000,
      })
    }
  }, [editor, pushToast])

  const navigatePreview = useCallback(
    (delta) => {
      setPreviewPage((current) => {
        if (current == null) return current
        return Math.min(pageCount, Math.max(1, current + delta))
      })
    },
    [pageCount],
  )

  const { undo } = editor
  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      if (typing) return

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo])

  return (
    <div className={styles.app}>
      <Masthead theme={theme} onToggleTheme={toggleTheme} />

      <main className={styles.layout}>
        <Sidebar editor={{ ...editor, exportPdf: handleExport }} isDragging={isDragging} />
        <Board
          editor={editor}
          thumbSize={thumbSize}
          onThumbSize={setThumbSize}
          onPreview={setPreviewPage}
        />
      </main>

      {editor.hasFile && (
        <ActionBar
          keptCount={editor.keptCount}
          removedCount={editor.removedNumbers.length}
          isExporting={editor.isExporting}
          disabled={pageCount === 0 || editor.keptCount === 0}
          onExport={handleExport}
        />
      )}

      {isDragging && <DropOverlay replacing={editor.hasFile} />}

      {previewPage != null && (
        <PreviewDialog
          pageNumber={previewPage}
          pageCount={pageCount}
          isRemoved={editor.removed.has(previewPage)}
          renderPreview={editor.renderPreview}
          onClose={() => setPreviewPage(null)}
          onNavigate={navigatePreview}
          onToggle={editor.togglePage}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
