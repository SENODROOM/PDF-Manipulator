import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

/*
 * Both PDF libraries are heavy and neither is needed until the user actually
 * opens a file, so they are code-split behind dynamic imports and cached after
 * the first use. `?url` above is only a string, so it stays a static import.
 */

let pdfjsPromise
let pdfLibPromise

function loadPdfjs() {
  pdfjsPromise ??= import('pdfjs-dist').then((pdfjsLib) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker
    return pdfjsLib
  })
  return pdfjsPromise
}

function loadPdfLib() {
  pdfLibPromise ??= import('pdf-lib')
  return pdfLibPromise
}

/** Optional warm-up so the first file open doesn't wait on a network round trip. */
export function prefetchPdfEngine() {
  loadPdfjs().catch(() => {})
}

/** Cap the backing-store scale so huge pages don't blow past canvas limits. */
const MAX_PIXEL_RATIO = 2
const MAX_CANVAS_EDGE = 4096

export class PdfError extends Error {
  constructor(message, cause) {
    super(message)
    this.name = 'PdfError'
    this.cause = cause
  }
}

function messageFor(err) {
  const name = err?.name ?? ''
  if (name === 'PasswordException') {
    return 'That PDF is password-protected. Remove the password and try again.'
  }
  if (name === 'InvalidPDFException') {
    return "That file isn't a readable PDF — it may be corrupted."
  }
  return "Couldn't read that PDF. It may be corrupted or in an unsupported format."
}

/**
 * Opens a document for rendering. pdf.js transfers the buffer it is handed to
 * its worker (leaving it detached), so it always gets a private copy.
 */
export async function openDocument(bytes) {
  try {
    const pdfjsLib = await loadPdfjs()
    const task = pdfjsLib.getDocument({
      data: bytes.slice(),
      isEvalSupported: false,
      disableAutoFetch: true,
    })
    return await task.promise
  } catch (err) {
    throw new PdfError(messageFor(err), err)
  }
}

function pixelRatio() {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  return Math.min(dpr, MAX_PIXEL_RATIO)
}

async function canvasToUrl(canvas) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82))
  // Release the backing store as soon as the bitmap is encoded.
  canvas.width = 0
  canvas.height = 0
  if (!blob) throw new PdfError('The browser could not encode a page image.')
  return URL.createObjectURL(blob)
}

/**
 * Renders one page to an object URL sized to `targetWidth` CSS pixels.
 * The caller owns the URL and must revoke it (see `revokeUrls`).
 */
export async function renderPage(pdf, pageNumber, { targetWidth = 240, ratio = pixelRatio() } = {}) {
  const page = await pdf.getPage(pageNumber)
  try {
    const unscaled = page.getViewport({ scale: 1 })
    const fit = targetWidth / unscaled.width
    const capped = Math.min(fit * ratio, MAX_CANVAS_EDGE / Math.max(unscaled.width, unscaled.height))
    const viewport = page.getViewport({ scale: capped })

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(viewport.width))
    canvas.height = Math.max(1, Math.floor(viewport.height))

    const context = canvas.getContext('2d', { alpha: false })
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: context, viewport }).promise

    return {
      url: await canvasToUrl(canvas),
      width: unscaled.width,
      height: unscaled.height,
    }
  } finally {
    page.cleanup()
  }
}

/** Best-effort cleanup for a batch of object URLs. */
export function revokeUrls(urls) {
  for (const url of urls) {
    if (url) URL.revokeObjectURL(url)
  }
}

/**
 * Builds a new PDF containing only `keepIndices` (0-based, in output order).
 * Returns the serialized bytes; nothing here touches the network.
 */
export async function buildPdf(sourceBytes, keepIndices) {
  if (keepIndices.length === 0) {
    throw new PdfError('Keep at least one page to export.')
  }
  try {
    const { PDFDocument } = await loadPdfLib()
    const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true })
    const output = await PDFDocument.create()
    const copied = await output.copyPages(source, keepIndices)
    for (const page of copied) output.addPage(page)

    output.setProducer('Leaflet')
    output.setCreator('Leaflet — client-side PDF page editor')
    output.setModificationDate(new Date())

    return await output.save()
  } catch (err) {
    if (err instanceof PdfError) throw err
    throw new PdfError('Something went wrong while building the new PDF.', err)
  }
}

/** Hands a byte array to the browser as a download. */
export function saveBytes(bytes, fileName) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  // Give the download a tick to start before the blob is dropped.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function isPdfFile(file) {
  if (!file) return false
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

/** `report.pdf` -> `report-edited.pdf`. */
export function editedName(fileName) {
  const base = fileName.replace(/\.pdf$/i, '').trim() || 'document'
  return `${base}-edited.pdf`
}
