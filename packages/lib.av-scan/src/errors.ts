// Thrown by scanBytes() when clamd could not be reached (connection error,
// timeout) or replied with something other than a clean OK/FOUND verdict,
// AND the client's config has failClosed !== false. Callers (e.g. the
// gateway's upload routes) catch this and reject the upload rather than
// letting unscanned bytes through.
export class AvScanUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AvScanUnavailableError';
  }
}
