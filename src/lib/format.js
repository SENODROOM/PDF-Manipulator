const UNITS = ['B', 'KB', 'MB', 'GB']

/** Human-readable file size, e.g. `2.4 MB`. */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1
  return `${value.toFixed(digits)} ${UNITS[unit]}`
}

/** `1 page` / `12 pages`. */
export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

/**
 * Collapses sorted page numbers into readable ranges: [1,2,3,7,9,10] -> "1–3, 7, 9–10".
 * Returns '' for an empty list.
 */
export function formatRanges(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b)
  if (sorted.length === 0) return ''

  const parts = []
  let start = sorted[0]
  let prev = sorted[0]

  for (let i = 1; i <= sorted.length; i += 1) {
    const current = sorted[i]
    if (current !== prev + 1) {
      parts.push(start === prev ? `${start}` : `${start}\u2013${prev}`)
      start = current
    }
    prev = current
  }
  return parts.join(', ')
}
