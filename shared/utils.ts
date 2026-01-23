/**
 * Shared Utility Functions
 *
 * Common utility functions used by both backend and dashboard.
 */

/**
 * Safe division helper to prevent NaN/Infinity
 * @param numerator - The numerator
 * @param denominator - The denominator
 * @param fallback - Fallback value if division is invalid (default: 0)
 * @returns Result of division or fallback
 */
export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (denominator === 0 || !Number.isFinite(denominator)) return fallback
  const result = numerator / denominator
  return Number.isFinite(result) ? result : fallback
}

/**
 * Normalize score to percentage format
 * Handles both decimal format (0.825) and percentage format (75)
 * @param score - Score value (0-1 or 0-100)
 * @returns Percentage value (0-100)
 */
export function normalizeScore(score: number): number {
  return score > 1 ? score : score * 100
}
