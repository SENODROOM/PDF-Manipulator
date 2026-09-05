import { useCallback, useEffect, useState } from 'react'

/** A number in state, persisted to localStorage and clamped to [min, max]. */
export function useStoredNumber(key, fallback, { min = -Infinity, max = Infinity } = {}) {
  const [value, setValue] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(key))
      if (Number.isFinite(stored) && stored >= min && stored <= max) return stored
    } catch {
      /* ignore unavailable storage */
    }
    return fallback
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, String(value))
    } catch {
      /* ignore unavailable storage */
    }
  }, [key, value])

  const set = useCallback(
    (next) => setValue(Math.min(max, Math.max(min, Number(next)))),
    [max, min],
  )

  return [value, set]
}
