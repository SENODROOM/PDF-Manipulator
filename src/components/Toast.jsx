import { useEffect } from 'react'
import { cx } from '../lib/cx.js'
import { Icon } from './Icon.jsx'
import styles from './Toast.module.css'

function Toast({ toast, onDismiss }) {
  const { id, tone = 'success', title, detail, timeout } = toast

  useEffect(() => {
    if (!timeout) return undefined
    const handle = setTimeout(() => onDismiss(id), timeout)
    return () => clearTimeout(handle)
  }, [id, onDismiss, timeout])

  return (
    <div
      className={cx(styles.toast, tone === 'error' && styles.error)}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span className={styles.icon}>
        <Icon name={tone === 'error' ? 'alert' : 'check'} size={16} />
      </span>
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        {detail && <p className={styles.detail}>{detail}</p>}
      </div>
      <button
        type="button"
        className={styles.close}
        onClick={() => onDismiss(id)}
        aria-label="Dismiss"
      >
        <Icon name="close" size={13} />
      </button>
    </div>
  )
}

export function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div className={styles.stack}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
