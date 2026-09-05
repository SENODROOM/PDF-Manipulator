/** Joins truthy class names — `cx(a, cond && b)`. */
export function cx(...values) {
  return values.filter(Boolean).join(' ')
}
