/** Escape a string for safe use inside RegExp(...). */
export function escapeRegex(s) {
  return String(s ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
