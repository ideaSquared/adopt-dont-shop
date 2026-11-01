/**
 * Minimal gateway client for the API-driven dev seed (scripts/seed.mjs).
 *
 * Talks to the gateway exactly like the SPA does: a per-session cookie jar,
 * the CSRF double-submit (GET /api/v1/csrf-token, echo it as x-csrf-token on
 * every state-changing request), and cookie-based auth after login. Host-side
 * script: it must not import any @adopt-dont-shop/* workspace package.
 */

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export class ApiError extends Error {
  constructor(method, path, status, body) {
    const detail = typeof body === 'string' ? body : JSON.stringify(body);
    super(`${method} ${path} failed: ${status} ${String(detail).slice(0, 500)}`);
    this.status = status;
    this.body = body;
  }
}

// Fold Set-Cookie headers into the jar (name=value only; attributes ignored).
const absorbCookies = (jar, headers) => {
  const setCookies = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];
  for (const line of setCookies) {
    const [pair] = line.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) {
      jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }
};

const cookieHeader = jar =>
  [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');

const parseBody = async res => {
  const text = await res.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/**
 * Create an anonymous session against `baseUrl`. `fetchImpl` is injectable
 * so the seed logic can be tested without a running gateway.
 */
export const createSession = (baseUrl, fetchImpl = globalThis.fetch) => {
  const jar = new Map();
  let csrfToken;

  const raw = async (method, path, body) => {
    const headers = { accept: 'application/json' };
    if (jar.size > 0) {
      headers.cookie = cookieHeader(jar);
    }
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
    }
    if (MUTATING.has(method)) {
      headers['x-csrf-token'] = await ensureCsrf();
    }
    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    absorbCookies(jar, res.headers);
    return { status: res.status, body: await parseBody(res) };
  };

  const ensureCsrf = async () => {
    if (!csrfToken) {
      const res = await raw('GET', '/api/v1/csrf-token');
      if (res.status !== 200 || !res.body?.csrfToken) {
        throw new ApiError('GET', '/api/v1/csrf-token', res.status, res.body);
      }
      csrfToken = res.body.csrfToken;
    }
    return csrfToken;
  };

  // `request` returns { status, body } for any status; `call` throws unless
  // the status is 2xx or listed in `allow`.
  const request = (method, path, body) => raw(method, path, body);

  const call = async (method, path, body, { allow = [] } = {}) => {
    const res = await raw(method, path, body);
    if ((res.status >= 200 && res.status < 300) || allow.includes(res.status)) {
      return res;
    }
    throw new ApiError(method, path, res.status, res.body);
  };

  return {
    request,
    call,
    get: (path, opts) => call('GET', path, undefined, opts),
    post: (path, body, opts) => call('POST', path, body ?? {}, opts),
    put: (path, body, opts) => call('PUT', path, body ?? {}, opts),
    patch: (path, body, opts) => call('PATCH', path, body ?? {}, opts),
  };
};

/** Log in a fresh session. Returns the session, or null on bad credentials. */
export const login = async (baseUrl, email, password, fetchImpl) => {
  const session = createSession(baseUrl, fetchImpl);
  const res = await session.request('POST', '/api/v1/auth/login', { email, password });
  if (res.status === 200) {
    return session;
  }
  if (res.status === 401 || res.status === 403) {
    return null;
  }
  throw new ApiError('POST', '/api/v1/auth/login', res.status, res.body);
};
