import React, { useEffect, useMemo, useState } from 'react';
import { TwoFactorSettings } from '@adopt-dont-shop/lib.auth';
import {
  securityService,
  type IpRule,
  type IpRuleType,
  type LoginHistoryEntry,
  type Session,
  type SuspiciousActivityEntry,
} from '../services/securityService';
import * as styles from './SecurityCenter.css';

type TabKey = 'mfa' | 'sessions' | 'ip-rules' | 'login-history' | 'recovery' | 'suspicious';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'mfa', label: 'Two-Factor Auth' },
  { key: 'sessions', label: 'Active Sessions' },
  { key: 'ip-rules', label: 'IP Restrictions' },
  { key: 'login-history', label: 'Login History' },
  { key: 'suspicious', label: 'Suspicious Activity' },
  { key: 'recovery', label: 'Account Recovery' },
];

const SecurityCenter: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('mfa');

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1>Security Center</h1>
        <p>
          Manage advanced security controls for the admin platform: two-factor enrolment, IP
          restrictions, active sessions, account recovery, and security activity monitoring.
        </p>
      </div>

      <div className={styles.tabBar} role='tablist' aria-label='Security center tabs'>
        {TABS.map(t => (
          <button
            key={t.key}
            type='button'
            role='tab'
            aria-selected={tab === t.key}
            className={styles.tabButton}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'mfa' && <MfaTab />}
      {tab === 'sessions' && <SessionsTab />}
      {tab === 'ip-rules' && <IpRulesTab />}
      {tab === 'login-history' && <LoginHistoryTab />}
      {tab === 'suspicious' && <SuspiciousTab />}
      {tab === 'recovery' && <RecoveryTab />}
    </div>
  );
};

// ----- MFA -----

const MfaTab: React.FC = () => (
  <div className={styles.section}>
    <h2>Two-Factor Authentication</h2>
    <p>
      Add an extra layer of security to your admin account by requiring a verification code on
      sign-in.
    </p>
    <TwoFactorSettings />
  </div>
);

// ----- Sessions -----

const SessionsTab: React.FC = () => {
  const [userIdFilter, setUserIdFilter] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    securityService
      .listSessions({ userId: userIdFilter || undefined, limit: 50 })
      .then(res => {
        if (!cancelled) {
          setSessions(res.data);
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load sessions');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userIdFilter, refreshKey]);

  const handleRevoke = async (sessionId: string) => {
    if (!window.confirm('Revoke this session? The user will need to sign in again.')) {
      return;
    }
    try {
      await securityService.revokeSession(sessionId);
      setRefreshKey(k => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke session');
    }
  };

  const handleRevokeAllForUser = async () => {
    if (!userIdFilter) {
      return;
    }
    if (!window.confirm(`Revoke ALL sessions for user ${userIdFilter}?`)) {
      return;
    }
    try {
      await securityService.revokeAllUserSessions(userIdFilter);
      setRefreshKey(k => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke sessions');
    }
  };

  return (
    <div className={styles.section}>
      <h2>Active Sessions</h2>
      <p>
        Each entry represents a refresh-token family — a logged-in browser or device. Revoke a row
        to force that device to sign in again.
      </p>

      <div className={styles.inlineForm}>
        <input
          className={styles.input}
          placeholder='Filter by user ID'
          value={userIdFilter}
          onChange={e => setUserIdFilter(e.target.value)}
        />
        <button
          type='button'
          className={styles.secondaryButton}
          onClick={() => setRefreshKey(k => k + 1)}
        >
          Refresh
        </button>
        <button
          type='button'
          className={styles.dangerButton}
          onClick={handleRevokeAllForUser}
          disabled={!userIdFilter}
        >
          Revoke all for user
        </button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading ? (
        <div className={styles.emptyState}>Loading…</div>
      ) : sessions.length === 0 ? (
        <div className={styles.emptyState}>No active sessions match this filter.</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>User</th>
              <th>Created</th>
              <th>Expires</th>
              <th>Family</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => (
              <tr key={s.sessionId}>
                <td>
                  {s.user ? (
                    <>
                      <div>{s.user.email}</div>
                      <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>{s.userId}</div>
                    </>
                  ) : (
                    s.userId
                  )}
                </td>
                <td>{new Date(s.createdAt).toLocaleString()}</td>
                <td>{new Date(s.expiresAt).toLocaleString()}</td>
                <td title={s.familyId}>{s.familyId.slice(0, 8)}…</td>
                <td>
                  <button
                    type='button'
                    className={styles.dangerButton}
                    onClick={() => handleRevoke(s.sessionId)}
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ----- IP Rules -----

const IpRulesTab: React.FC = () => {
  const [rules, setRules] = useState<IpRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [type, setType] = useState<IpRuleType>('block');
  const [cidr, setCidr] = useState('');
  const [label, setLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    securityService
      .listIpRules()
      .then(data => {
        if (!cancelled) {
          setRules(data);
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load IP rules');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cidr.trim()) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await securityService.createIpRule({ type, cidr: cidr.trim(), label: label.trim() || null });
      setCidr('');
      setLabel('');
      setRefreshKey(k => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create IP rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (ipRuleId: string) => {
    if (!window.confirm('Delete this IP rule?')) {
      return;
    }
    try {
      await securityService.deleteIpRule(ipRuleId);
      setRefreshKey(k => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete IP rule');
    }
  };

  return (
    <div className={styles.section}>
      <h2>IP Restrictions</h2>
      <p>
        Block rules deny logins from matching addresses. If any allow rules exist, requests must
        match at least one to pass. Supports IPv4 single-address or CIDR (e.g.{' '}
        <code>10.0.0.0/8</code>) and IPv6 single-address.
      </p>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <form className={styles.inlineForm} onSubmit={handleAdd}>
        <select
          aria-label='Rule type'
          className={styles.select}
          value={type}
          onChange={e => setType(e.target.value as IpRuleType)}
        >
          <option value='block'>Block</option>
          <option value='allow'>Allow</option>
        </select>
        <input
          className={styles.input}
          placeholder='IP or CIDR (e.g. 10.0.0.0/8)'
          value={cidr}
          onChange={e => setCidr(e.target.value)}
          required
        />
        <input
          className={styles.input}
          placeholder='Label (optional)'
          value={label}
          onChange={e => setLabel(e.target.value)}
        />
        <button type='submit' className={styles.primaryButton} disabled={submitting}>
          Add rule
        </button>
      </form>

      {loading ? (
        <div className={styles.emptyState}>Loading…</div>
      ) : rules.length === 0 ? (
        <div className={styles.emptyState}>No IP rules configured.</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Type</th>
              <th>CIDR</th>
              <th>Label</th>
              <th>Expires</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.ipRuleId}>
                <td>
                  <span
                    className={r.type === 'block' ? styles.statusFailure : styles.statusSuccess}
                  >
                    {r.type}
                  </span>
                </td>
                <td>
                  <code>{r.cidr}</code>
                </td>
                <td>{r.label || '—'}</td>
                <td>{r.expiresAt ? new Date(r.expiresAt).toLocaleString() : 'Never'}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>
                  <button
                    type='button'
                    className={styles.dangerButton}
                    onClick={() => handleDelete(r.ipRuleId)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ----- Login history -----

const LoginHistoryTab: React.FC = () => {
  const [userIdFilter, setUserIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failure'>('all');
  const [entries, setEntries] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    securityService
      .getLoginHistory({
        userId: userIdFilter || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100,
      })
      .then(res => {
        if (!cancelled) {
          setEntries(res.data);
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load login history');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userIdFilter, statusFilter]);

  return (
    <div className={styles.section}>
      <h2>Login History</h2>
      <p>
        Successful and failed authentication events for the last 30 days, captured from the audit
        log.
      </p>

      <div className={styles.inlineForm}>
        <input
          className={styles.input}
          placeholder='Filter by user ID'
          value={userIdFilter}
          onChange={e => setUserIdFilter(e.target.value)}
        />
        <select
          className={styles.select}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'all' | 'success' | 'failure')}
          aria-label='Filter by status'
        >
          <option value='all'>All statuses</option>
          <option value='success'>Successes only</option>
          <option value='failure'>Failures only</option>
        </select>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading ? (
        <div className={styles.emptyState}>Loading…</div>
      ) : entries.length === 0 ? (
        <div className={styles.emptyState}>No login events match these filters.</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Status</th>
              <th>User</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id}>
                <td>{new Date(entry.timestamp).toLocaleString()}</td>
                <td>{entry.action}</td>
                <td>
                  <span
                    className={
                      entry.status === 'success'
                        ? styles.statusSuccess
                        : entry.status === 'failure'
                          ? styles.statusFailure
                          : styles.statusNeutral
                    }
                  >
                    {entry.status ?? 'unknown'}
                  </span>
                </td>
                <td>{entry.userEmail || entry.userId || '—'}</td>
                <td>{entry.ipAddress || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ----- Suspicious activity -----

const SuspiciousTab: React.FC = () => {
  const [threshold, setThreshold] = useState(5);
  const [windowHours, setWindowHours] = useState(24);
  const [entries, setEntries] = useState<SuspiciousActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    securityService
      .getSuspiciousActivity({ failureThreshold: threshold, windowHours })
      .then(data => {
        if (!cancelled) {
          setEntries(data);
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load suspicious activity');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [threshold, windowHours]);

  return (
    <div className={styles.section}>
      <h2>Suspicious Activity</h2>
      <p>
        Accounts (or unidentified actors, by IP) with at least N failed logins in the selected
        window. The default threshold mirrors the auth-service lockout rule (5 failures triggers a
        30-minute lockout) so anything flagged here is at imminent risk of being locked out.
      </p>

      <div className={styles.inlineForm}>
        <label>
          Threshold:{' '}
          <input
            type='number'
            min={1}
            className={styles.input}
            value={threshold}
            onChange={e => setThreshold(Math.max(1, parseInt(e.target.value, 10) || 1))}
          />
        </label>
        <label>
          Window (hours):{' '}
          <input
            type='number'
            min={1}
            className={styles.input}
            value={windowHours}
            onChange={e => setWindowHours(Math.max(1, parseInt(e.target.value, 10) || 1))}
          />
        </label>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading ? (
        <div className={styles.emptyState}>Loading…</div>
      ) : entries.length === 0 ? (
        <div className={styles.emptyState}>No suspicious activity in this window.</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>User</th>
              <th>Failed attempts</th>
              <th>Last attempt</th>
              <th>Last IP</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={`${entry.userId ?? entry.userEmail ?? entry.lastIp ?? idx}-${idx}`}>
                <td>{entry.userEmail || entry.userId || '(unidentified)'}</td>
                <td>{entry.failureCount}</td>
                <td>{new Date(entry.lastAttempt).toLocaleString()}</td>
                <td>{entry.lastIp || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ----- Recovery -----

const RecoveryTab: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isUserIdValid = useMemo(() => userId.trim().length > 0, [userId]);

  const handleUnlock = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const result = await securityService.unlockAccount(userId.trim());
      setMessage(
        result.wasLocked
          ? `Account ${userId.trim()} unlocked.`
          : `Account ${userId.trim()} was not locked; counter reset anyway.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to unlock account');
    } finally {
      setBusy(false);
    }
  };

  const handleForceLock = async () => {
    if (!window.confirm(`Force-lock account ${userId.trim()} and revoke all sessions?`)) {
      return;
    }
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await securityService.forceLockAccount(userId.trim(), reason.trim() || undefined);
      setMessage(`Account ${userId.trim()} locked for 24h. All sessions revoked.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to lock account');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.section}>
      <h2>Account Recovery & Takeover Prevention</h2>
      <p>
        If an account is suspected compromised, force-lock it (terminates all sessions and blocks
        sign-in for 24 hours) until the user has rotated their credentials. Use unlock to clear an
        automatic lockout once the user proves identity.
      </p>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {message && (
        <div
          className={styles.errorBanner}
          style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}
        >
          {message}
        </div>
      )}

      <div className={styles.inlineForm}>
        <input
          className={styles.input}
          placeholder='User ID'
          value={userId}
          onChange={e => setUserId(e.target.value)}
        />
        <input
          className={styles.input}
          placeholder='Reason (optional, for force-lock)'
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <button
          type='button'
          className={styles.primaryButton}
          onClick={handleUnlock}
          disabled={!isUserIdValid || busy}
        >
          Unlock account
        </button>
        <button
          type='button'
          className={styles.dangerButton}
          onClick={handleForceLock}
          disabled={!isUserIdValid || busy}
        >
          Force-lock & revoke
        </button>
      </div>
    </div>
  );
};

export default SecurityCenter;
