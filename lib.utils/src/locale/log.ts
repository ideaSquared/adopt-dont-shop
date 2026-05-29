/**
 * Log a non-fatal formatting error, staying silent in production so a bad
 * value from the server doesn't flood logs on every render.
 *
 * Centralising the environment guard here keeps it a single tested branch
 * instead of one duplicated guard per formatting call site.
 */
export function logFormatError(message: string, error: unknown): void {
  if (typeof process !== 'undefined' && process.env['NODE_ENV'] !== 'production') {
    console.error(message, error);
  }
}
