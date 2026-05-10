import { beforeEach, describe, expect, it } from 'vitest';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  clearStoredConsent,
  readStoredConsent,
  writeStoredConsent,
} from './cookie-consent-storage';

const CURRENT_VERSION = '2026-05-09-v1';

describe('cookie-consent-storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null when nothing has been written', () => {
    expect(readStoredConsent(CURRENT_VERSION)).toBeNull();
  });

  it('round-trips a valid record', () => {
    const record = {
      cookiesVersion: CURRENT_VERSION,
      analyticsConsent: true,
      acceptedAt: '2026-05-10T09:00:00.000Z',
    };
    writeStoredConsent(record);

    expect(readStoredConsent(CURRENT_VERSION)).toEqual(record);
  });

  it('returns null when the stored cookiesVersion does not match the current version (forces re-prompt on bump)', () => {
    writeStoredConsent({
      cookiesVersion: '2025-01-01-old',
      analyticsConsent: true,
      acceptedAt: '2025-01-02T00:00:00.000Z',
    });

    expect(readStoredConsent(CURRENT_VERSION)).toBeNull();
  });

  it('returns null when the stored value is not valid JSON', () => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'not-json{');

    expect(readStoredConsent(CURRENT_VERSION)).toBeNull();
  });

  it('returns null when the stored value fails schema validation (missing fields)', () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({ cookiesVersion: CURRENT_VERSION })
    );

    expect(readStoredConsent(CURRENT_VERSION)).toBeNull();
  });

  it('returns null when the stored value has wrong types (analyticsConsent as string)', () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({
        cookiesVersion: CURRENT_VERSION,
        analyticsConsent: 'yes',
        acceptedAt: '2026-05-10T09:00:00.000Z',
      })
    );

    expect(readStoredConsent(CURRENT_VERSION)).toBeNull();
  });

  it('clears the record', () => {
    writeStoredConsent({
      cookiesVersion: CURRENT_VERSION,
      analyticsConsent: false,
      acceptedAt: '2026-05-10T09:00:00.000Z',
    });
    clearStoredConsent();

    expect(readStoredConsent(CURRENT_VERSION)).toBeNull();
  });
});
