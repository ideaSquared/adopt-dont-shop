// Behaviour tests for the weekly-digest consent helpers (ADS-1270) added
// to preferences.ts. Pre-existing functions in this module
// (findOrCreatePreferences, updatePreferences, isEmailChannelOpen) are not
// retroactively covered here — only the new behaviour this change ships.

import { describe, expect, it, vi } from 'vitest';

import type { DbConn } from './queue.js';
import {
  isWeeklyDigestConsented,
  loadWeeklyDigestConsentedUserIds,
  type DigestConsentRow,
} from './preferences.js';

const consentedRow: DigestConsentRow = {
  is_email_enabled: true,
  global_unsubscribe: false,
  is_blacklisted: false,
  digest_frequency: 'weekly',
};

describe('isWeeklyDigestConsented', () => {
  it('treats a missing row as the column defaults — consented', () => {
    expect(isWeeklyDigestConsented(undefined)).toBe(true);
  });

  it('is consented when email is enabled, not unsubscribed/blacklisted, and on weekly cadence', () => {
    expect(isWeeklyDigestConsented(consentedRow)).toBe(true);
  });

  it('excludes a globally unsubscribed user', () => {
    expect(isWeeklyDigestConsented({ ...consentedRow, global_unsubscribe: true })).toBe(false);
  });

  it('excludes a blacklisted user', () => {
    expect(isWeeklyDigestConsented({ ...consentedRow, is_blacklisted: true })).toBe(false);
  });

  it('excludes a user with the email channel disabled', () => {
    expect(isWeeklyDigestConsented({ ...consentedRow, is_email_enabled: false })).toBe(false);
  });

  it('excludes a user not on the weekly cadence', () => {
    expect(isWeeklyDigestConsented({ ...consentedRow, digest_frequency: 'daily' })).toBe(false);
    expect(isWeeklyDigestConsented({ ...consentedRow, digest_frequency: 'never' })).toBe(false);
  });
});

describe('loadWeeklyDigestConsentedUserIds', () => {
  it('returns [] without querying when given no candidate ids', async () => {
    const query = vi.fn();
    const conn = { query } as unknown as DbConn;
    const result = await loadWeeklyDigestConsentedUserIds(conn, []);
    expect(result).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });

  it('keeps consented users, drops unsubscribed/blacklisted/off-cadence ones, and defaults missing rows to consented', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        { user_id: 'usr-consented', ...consentedRow },
        { user_id: 'usr-unsubscribed', ...consentedRow, global_unsubscribe: true },
        { user_id: 'usr-monthly', ...consentedRow, digest_frequency: 'monthly' },
      ],
    });
    const conn = { query } as unknown as DbConn;

    const result = await loadWeeklyDigestConsentedUserIds(conn, [
      'usr-consented',
      'usr-unsubscribed',
      'usr-monthly',
      'usr-no-row',
    ]);

    expect(result.sort()).toEqual(['usr-consented', 'usr-no-row'].sort());
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/FROM email_preferences/);
    expect(sql).toMatch(/user_id = ANY\(\$1::uuid\[\]\)/);
    expect(params[0]).toEqual(['usr-consented', 'usr-unsubscribed', 'usr-monthly', 'usr-no-row']);
  });
});
