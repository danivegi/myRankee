/**
 * Parse a DB timestamp treating naive strings (no timezone info) as UTC.
 * Postgres stores UTC but returns strings without 'Z' when the column is
 * "timestamp without time zone". JS Date() would then parse them as local
 * time, causing an offset equal to the server's timezone.
 *
 * Handles:
 *   "2024-06-02 12:30:00"            → treated as UTC (appends 'Z')
 *   "2024-06-02T12:30:00.123456"     → treated as UTC (appends 'Z')
 *   "2024-06-02T12:30:00Z"           → already UTC-aware, left as-is
 *   "2024-06-02T12:30:00+02:00"      → already offset-aware, left as-is
 *   Date objects                     → returned unchanged
 *   null / undefined                 → null
 */
export function parseDbDate(value) {
  if (value == null) return null;
  if (value instanceof Date) return value;
  const s = String(value);
  // Already has explicit timezone — parse as-is
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);
  // Naive string — replace space separator (Postgres style) and force UTC
  return new Date(s.replace(' ', 'T') + 'Z');
}