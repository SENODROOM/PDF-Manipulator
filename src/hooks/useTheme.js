import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'leaflet:theme'
const MODES = ['system', 'light', 'dark']

function systemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStored() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return MODES.includes(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

/**
 * Theme preference (`system` | `light` | `dark`) mirrored onto `data-theme`.
 * The initial paint is handled by the inline script in index.html.
 */
export function useTheme() {
  const [mode, setMode] = useState(readStored)
  const [resolved, setResolved] = useState(() => (readStored() === 'system' ? systemTheme() : readStored()))

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => setResolved(mode === 'system' ? systemTheme() : mode)

    apply()
    if (mode !== 'system') return undefined

    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [mode])

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    try {
      if (mode === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      /* storage can be unavailable (private mode); the theme still applies */
    }
  }, [mode, resolved])

  const toggle = useCallback(() => {
    setMode((current) => {
      const next = (current === 'system' ? systemTheme() : current) === 'dark' ? 'light' : 'dark'
      return next
    })
  }, [])

  return { mode, resolved, setMode, toggle }
}
