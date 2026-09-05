import { useEffect, useRef, useState } from 'react'

function draggingFiles(event) {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

/**
 * Window-wide drop target.
 *
 * Two things this fixes over a plain drop zone: dropping a PDF anywhere else on
 * the page no longer makes the browser navigate away from the app, and the
 * dragging flag uses an enter/leave counter so it doesn't flicker as the
 * pointer crosses child elements.
 */
export function useFileDrop(onFile) {
  const [isDragging, setIsDragging] = useState(false)
  const depthRef = useRef(0)
  const handlerRef = useRef(onFile)

  useEffect(() => {
    handlerRef.current = onFile
  }, [onFile])

  useEffect(() => {
    const onDragEnter = (event) => {
      if (!draggingFiles(event)) return
      event.preventDefault()
      depthRef.current += 1
      setIsDragging(true)
    }

    const onDragOver = (event) => {
      if (!draggingFiles(event)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    }

    const onDragLeave = (event) => {
      if (!draggingFiles(event)) return
      depthRef.current = Math.max(0, depthRef.current - 1)
      if (depthRef.current === 0) setIsDragging(false)
    }

    const onDrop = (event) => {
      if (!draggingFiles(event)) return
      event.preventDefault()
      depthRef.current = 0
      setIsDragging(false)
      const file = event.dataTransfer.files?.[0]
      if (file) handlerRef.current?.(file)
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)

    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  return isDragging
}
