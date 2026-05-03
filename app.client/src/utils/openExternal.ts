/**
 * Safely opens an external URL in a new tab with noopener/noreferrer.
 * Rejects non-http(s) protocols to prevent javascript: XSS.
 * For in-app navigation use react-router's useNavigate instead.
 */
export const openExternal = (raw: string): void => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return;
  }
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
};
