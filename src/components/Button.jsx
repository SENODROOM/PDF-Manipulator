import { cx } from '../lib/cx.js'
import { Icon } from './Icon.jsx'
import styles from './Button.module.css'

/**
 * The one button in the app.
 *
 * variant: solid | outline | subtle | text | danger
 * size:    md | sm | icon   (`icon` requires an accessible `title`/`aria-label`)
 */
export function Button({
  variant = 'outline',
  size = 'md',
  icon,
  iconSize,
  full = false,
  className,
  children,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      className={cx(
        styles.btn,
        styles[variant],
        size !== 'md' && styles[size],
        full && styles.full,
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={iconSize ?? (size === 'sm' ? 14 : 16)} />}
      {children && <span className={styles.label}>{children}</span>}
    </button>
  )
}
