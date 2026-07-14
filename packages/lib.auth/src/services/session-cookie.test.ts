import { clearSessionCookie, hasSessionCookie } from './session-cookie';

describe('hasSessionCookie', () => {
  afterEach(() => {
    // Expire anything the test set so state doesn't leak between cases.
    document.cookie = 'hasSession=; Max-Age=0; path=/';
    document.cookie = 'otherCookie=; Max-Age=0; path=/';
  });

  it('returns false when no cookies are set', () => {
    expect(hasSessionCookie()).toBe(false);
  });

  it('returns false when only unrelated cookies are present', () => {
    document.cookie = 'otherCookie=abc';
    expect(hasSessionCookie()).toBe(false);
  });

  it('returns true when the hasSession marker cookie is present', () => {
    document.cookie = 'hasSession=1';
    expect(hasSessionCookie()).toBe(true);
  });

  it('finds the marker cookie among several cookies', () => {
    document.cookie = 'otherCookie=abc';
    document.cookie = 'hasSession=1';
    expect(hasSessionCookie()).toBe(true);
  });
});

describe('clearSessionCookie', () => {
  it('removes the session marker cookie', () => {
    document.cookie = 'hasSession=1';
    expect(hasSessionCookie()).toBe(true);

    clearSessionCookie();

    expect(hasSessionCookie()).toBe(false);
  });

  it('is a no-op when the cookie was never set', () => {
    expect(() => clearSessionCookie()).not.toThrow();
    expect(hasSessionCookie()).toBe(false);
  });
});
