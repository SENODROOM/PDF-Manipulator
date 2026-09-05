import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import {
  PdfError,
  buildPdf,
  editedName,
  isPdfFile,
  openDocument,
  renderPage,
  revokeUrls,
  saveBytes,
} from '../lib/pdf.js'

const THUMB_WIDTH = 280
const HISTORY_LIMIT = 40

const initialState = {
  phase: 'idle', // idle | loading | ready | exporting
  fileName: '',
  fileSize: 0,
  pageCount: 0,
  pages: [], // { number, url, width, height, failed }
  removed: new Set(),
  past: [], // previous `removed` sets, for undo
  error: null,
}

function withSelection(state, removed) {
  return {
    ...state,
    removed,
    past: [...state.past, state.removed].slice(-HISTORY_LIMIT),
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'reset':
      return { ...initialState, removed: new Set(), past: [] }

    case 'load-start':
      return {
        ...initialState,
        removed: new Set(),
        past: [],
        phase: 'loading',
        fileName: action.fileName,
        fileSize: action.fileSize,
      }

    case 'doc-opened':
      return { ...state, pageCount: action.pageCount }

    case 'page-rendered':
      return { ...state, pages: [...state.pages, action.page] }

    case 'load-done':
      return { ...state, phase: 'ready' }

    case 'export-start':
      return { ...state, phase: 'exporting', error: null }

    case 'export-done':
      return { ...state, phase: 'ready' }

    case 'select':
      return withSelection(state, action.removed)

    case 'undo': {
      if (state.past.length === 0) return state
      return {
        ...state,
        removed: state.past[state.past.length - 1],
        past: state.past.slice(0, -1),
      }
    }

    case 'error':
      return { ...state, phase: action.phase ?? state.phase, error: action.error }

    case 'dismiss-error':
      return { ...state, error: null }

    default:
      return state
  }
}

/**
 * Owns the loaded document: its bytes, the rendered thumbnails and the set of
 * pages marked for removal.
 *
 * Loads are generation-tagged, so dropping a second file abandons the first
 * render loop rather than letting the two interleave into shared state.
 */
export function usePdfEditor() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const runIdRef = useRef(0)
  const bytesRef = useRef(null)
  const docRef = useRef(null)
  const urlsRef = useRef([])
  const anchorRef = useRef(null)

  const dispose = useCallback(() => {
    revokeUrls(urlsRef.current)
    urlsRef.current = []
    docRef.current?.destroy().catch(() => {})
    docRef.current = null
    bytesRef.current = null
    anchorRef.current = null
  }, [])

  useEffect(() => dispose, [dispose])

  const reset = useCallback(() => {
    runIdRef.current += 1
    dispose()
    dispatch({ type: 'reset' })
  }, [dispose])

  const load = useCallback(
    async (file) => {
      if (!file) return
      if (!isPdfFile(file)) {
        dispatch({
          type: 'error',
          error: 'That file is not a PDF. Choose a .pdf file to continue.',
        })
        return
      }

      runIdRef.current += 1
      const runId = runIdRef.current
      const stale = () => runIdRef.current !== runId

      dispose()
      dispatch({ type: 'load-start', fileName: file.name, fileSize: file.size })

      let pdf
      try {
        const bytes = new Uint8Array(await file.arrayBuffer())
        if (stale()) return
        bytesRef.current = bytes
        pdf = await openDocument(bytes)
      } catch (err) {
        if (stale()) return
        console.error(err)
        dispatch({
          type: 'error',
          phase: 'idle',
          error: err instanceof PdfError ? err.message : 'That file could not be read.',
        })
        return
      }

      if (stale()) {
        pdf.destroy().catch(() => {})
        return
      }

      docRef.current = pdf
      dispatch({ type: 'doc-opened', pageCount: pdf.numPages })

      for (let number = 1; number <= pdf.numPages; number += 1) {
        if (stale()) return
        try {
          const rendered = await renderPage(pdf, number, { targetWidth: THUMB_WIDTH })
          if (stale()) {
            revokeUrls([rendered.url])
            return
          }
          urlsRef.current.push(rendered.url)
          dispatch({ type: 'page-rendered', page: { number, ...rendered } })
        } catch (err) {
          if (stale()) return
          console.error('Page ' + number + ' failed to render', err)
          dispatch({ type: 'page-rendered', page: { number, url: null, failed: true } })
        }
      }

      if (!stale()) dispatch({ type: 'load-done' })
    },
    [dispose],
  )

  const select = useCallback((removed) => dispatch({ type: 'select', removed }), [])

  const allNumbers = useMemo(
    () => Array.from({ length: state.pageCount }, (_, i) => i + 1),
    [state.pageCount],
  )

  /**
   * Clicking a page toggles it. Shift-clicking applies the same result to the
   * whole run between the previous click and this one.
   */
  const togglePage = useCallback(
    (pageNumber, extend = false) => {
      const anchor = anchorRef.current
      anchorRef.current = pageNumber

      const next = new Set(state.removed)
      const marking = !state.removed.has(pageNumber)

      if (extend && anchor != null && anchor !== pageNumber) {
        const from = Math.min(anchor, pageNumber)
        const to = Math.max(anchor, pageNumber)
        for (let n = from; n <= to; n += 1) {
          if (marking) next.add(n)
          else next.delete(n)
        }
      } else if (marking) {
        next.add(pageNumber)
      } else {
        next.delete(pageNumber)
      }

      select(next)
    },
    [select, state.removed],
  )

  const markFirst = useCallback(() => {
    if (state.pageCount > 0) select(new Set(state.removed).add(1))
  }, [select, state.pageCount, state.removed])

  const markLast = useCallback(() => {
    if (state.pageCount > 0) select(new Set(state.removed).add(state.pageCount))
  }, [select, state.pageCount, state.removed])

  const markAll = useCallback(() => select(new Set(allNumbers)), [allNumbers, select])

  const invert = useCallback(
    () => select(new Set(allNumbers.filter((n) => !state.removed.has(n)))),
    [allNumbers, select, state.removed],
  )

  const clearMarks = useCallback(() => select(new Set()), [select])

  const undo = useCallback(() => dispatch({ type: 'undo' }), [])

  const dismissError = useCallback(() => dispatch({ type: 'dismiss-error' }), [])

  const keptNumbers = useMemo(
    () => allNumbers.filter((n) => !state.removed.has(n)),
    [allNumbers, state.removed],
  )

  const removedNumbers = useMemo(
    () => allNumbers.filter((n) => state.removed.has(n)),
    [allNumbers, state.removed],
  )

  const exportPdf = useCallback(async () => {
    const bytes = bytesRef.current
    if (!bytes || keptNumbers.length === 0 || state.phase === 'exporting') return null

    dispatch({ type: 'export-start' })
    try {
      const output = await buildPdf(
        bytes,
        keptNumbers.map((n) => n - 1),
      )
      const name = editedName(state.fileName)
      saveBytes(output, name)
      dispatch({ type: 'export-done' })
      return { name, pageCount: keptNumbers.length }
    } catch (err) {
      console.error(err)
      dispatch({
        type: 'error',
        phase: 'ready',
        error: err instanceof PdfError ? err.message : 'Export failed. Try again.',
      })
      return null
    }
  }, [keptNumbers, state.fileName, state.phase])

  /** Renders one page large for the preview dialog. The caller revokes the URL. */
  const renderPreview = useCallback(async (pageNumber, targetWidth) => {
    const pdf = docRef.current
    if (!pdf) return null
    return renderPage(pdf, pageNumber, { targetWidth })
  }, [])

  return {
    ...state,
    hasFile: state.phase !== 'idle',
    isExporting: state.phase === 'exporting',
    isLoading: state.phase === 'loading',
    canUndo: state.past.length > 0,
    keptNumbers,
    removedNumbers,
    keptCount: keptNumbers.length,
    load,
    reset,
    togglePage,
    markFirst,
    markLast,
    markAll,
    invert,
    clearMarks,
    undo,
    dismissError,
    exportPdf,
    renderPreview,
  }
}
