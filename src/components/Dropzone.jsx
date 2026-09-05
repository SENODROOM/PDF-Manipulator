import { useRef } from 'react'
import { cx } from '../lib/cx.js'
import { Icon } from './Icon.jsx'
import styles from './Dropzone.module.css'

/**
 * Click-to-browse target. Dragging is handled globally by `useFileDrop`, so this
 * only needs to reflect the drag state it is given.
 */
export function Dropzone({ isDragging, onFile }) {
  const inputRef = useRef(null)

  const handleChange = (event) => {
    const file = event.target.files?.[0]
    // Reset so re-picking the same file still fires a change event.
    event.target.value = ''
    if (file) onFile(file)
  }

  return (
    <button
      type="button"
      className={cx(styles.dropzone, isDragging && styles.active)}
      onClick={() => inputRef.current?.click()}
    >
      <span className={styles.icon}>
        <Icon name="plus" size={20} />
      </span>
      <span className={styles.title}>Drop a PDF anywhere</span>
      <span className={styles.sub}>or click to browse your files</span>
      <span className={styles.hint}>PDF · stays on this device</span>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleChange}
        hidden
      />
    </button>
  )
}
