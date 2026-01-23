/**
 * Shared Constants
 *
 * Common constants used by both backend and dashboard.
 */

/**
 * Unicode icons for tool types (no external library needed)
 */
export const TOOL_ICONS: Record<string, string> = {
  read: '\u{1F4D6}',   // 📖 Open book
  write: '\u{270F}',   // ✏️ Pencil
  bash: '\u{2328}',    // ⌨️ Keyboard
  edit: '\u{1F4DD}',   // 📝 Memo
  glob: '\u{1F50D}',   // 🔍 Magnifying glass
  grep: '\u{1F50E}',   // 🔎 Magnifying glass tilted
  search: '\u{1F50D}', // 🔍 Magnifying glass
  unknown: '\u{2753}', // ❓ Question mark
}

/**
 * Model tier colors for sub-agent display (Tailwind classes)
 */
export const MODEL_COLORS: Record<string, string> = {
  opus: 'text-purple-400 bg-purple-400/10',
  sonnet: 'text-blue-400 bg-blue-400/10',
  haiku: 'text-green-400 bg-green-400/10',
}
