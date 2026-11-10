import React, { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { TwoFactorSettings } from '@adopt-dont-shop/lib.auth';
import {
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  ErrorState,
  FormField,
  Heading,
  Input,
  PageHeader,
  SelectInput,
  Stack,
  StatusBadge,
  Tabs,
  Text,
  toast,
  useConfirm,
} from '@adopt-dont-shop/lib.components';
import { formatDisplayDate } from '@adopt-dont-shop/lib.utils';
import type {
  IpRule,
  IpRuleType,
  LoginHistoryEntry,
  Session,
  SuspiciousActivityEntry,
} from '../services/securityService';
import {
  useCreateIpRule,
  useDeleteIpRule,
  useForceLockAccount,
  useIpRules,
  useLoginHistory,
  useRevokeAllUserSessions,
  useRevokeSession,
  useSecuritySessions,
  useSuspiciousActivity,
  useUnlockAccount,
} from './SecurityCenter.queries';
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

const isTabKey = (value: string | undefined): value is TabKey =>
  value === 'mfa' ||
  value === 'sessions' ||
  value === 'ip-rules' ||
  value === 'login-history' ||
  value === 'suspicious' ||
  value === 'recovery';

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const formatDateTime = (value: string): string => formatDisplayDate(value, { includeTime: true });

// DataTable rows are untyped records; narrow them back to the row type in render.
const asRows = <T,>(rows: T[]): Record<string, unknown>[] =>
  // DataTable's `rows` prop is Record<string, unknown>[]; the cast is a pure widening.
  rows as unknown as Record<string, unknown>[];

type SectionProps = {
  title: string;
  children: React.ReactNode;
  description?: React.ReactNode;
};

const Section: React.FC<SectionProps> = ({ title, description, children }) => (
  <Card>
    <Stack spacing='md'>
      <Heading level='h2' size='lg' noMargin>
        {title}
      </Heading>
      {description ? <Text color='muted'>{description}</Text> : null}
      {children}
    </Stack>
  </Card>
);

const SecurityCenter: React.FC = () => {
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // The tab is driven by the URL when mounted via /security/:tab, but we also
  // keep a local fallback so the component works in isolation (e.g. tests, or
  // the unparameterised /security route) where useParams returns nothing.
  const urlTab: TabKey | null = isTabKey(tabParam) ? tabParam : null;
  const [localTab, setLocalTab] = useState<TabKey>(urlTab ?? 'mfa');
  const tab: TabKey = urlTab ?? localTab;

  const handleTabChange = (next: TabKey) => {
    // Navigating clears drill-down search params, keeping per-tab filter state
    // local. Browser back returns the user to the originating tab with its
    // params intact.
    setLocalTab(next);
    navigate(`/security/${next}`);
  };

  const userIdParam = searchParams.get('userId') ?? '';
  const ipParam = searchParams.get('ip') ?? '';

  const renderTab = (key: TabKey) => {
    switch (key) {
      case 'mfa':
        return <MfaTab />;
      case 'sessions':
        return <SessionsTab initialUserId={userIdParam} />;
      case 'ip-rules':
        return <IpRulesTab initialIp={ipParam} />;
      case 'login-history':
        return <LoginHistoryTab initialUserId={userIdParam} />;
      case 'suspicious':
        return <SuspiciousTab />;
      case 'recovery':
        return <RecoveryTab />;
    }
  };

  return (
    <Stack spacing='lg' className={styles.pageContainer}>
      <PageHeader
        title='Security Center'
        description='Manage advanced security controls for the admin platform: two-factor enrolment, IP restrictions, active sessions, account recovery, and security activity monitoring.'
      />

      <Tabs
        aria-label='Security center tabs'
        value={tab}
        onChange={id => isTabKey(id) && handleTabChange(id)}
        tabs={TABS.map(t => ({
          id: t.key,
          label: t.label,
          // Inactive panels stay mounted inside Tabs, so only render the active
          // tab's content to avoid fetching for hidden tabs.
          content: tab === t.key ? renderTab(t.key) : null,
        }))}
      />
    </Stack>
  );
};

// ----- MFA -----

const MfaTab: React.FC = () => (
  <Section
    title='Two-Factor Authentication'
    description='Add an extra layer of security to your admin account by requiring a verification code on sign-in.'
  >
    <TwoFactorSettings />
  </Section>
);

// ----- Sessions -----

type SessionsTabProps = { initialUserId?: string };

const SessionsTab: React.FC<SessionsTabProps> = ({ initialUserId = '' }) => {
  const navigate = useNavigate();
  const [userIdFilter, setUserIdFilter] = useState(initialUserId);
  const sessionsQuery = useSecuritySessions(userIdFilter);
  const revokeSession = useRevokeSession();
  const revokeAllUserSessions = useRevokeAllUserSessions();
  const { confirm, confirmProps } = useConfirm();

  const sessions: Session[] = sessionsQuery.data?.data ?? [];

  const handleRevoke = async (sessionId: string) => {
    const confirmed = await confirm({
      title: 'Revoke session?',
      message:
        'This will immediately sign the user out of this device. They will need to sign in again to regain access.',
      confirmText: 'Revoke session',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }
    try {
      await revokeSession.mutateAsync(sessionId);
    } catch (e) {
      toast.error(errorMessage(e, 'Failed to revoke session'));
    }
  };

  const handleRevokeAllForUser = async () => {
    if (!userIdFilter) {
      return;
    }
    const confirmed = await confirm({
      title: 'Revoke all sessions?',
      message: `This will immediately sign user ${userIdFilter} out of every device. They will need to sign in again on each one. This action cannot be undone.`,
      confirmText: 'Revoke all sessions',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }
    try {
      await revokeAllUserSessions.mutateAsync(userIdFilter);
    } catch (e) {
      toast.error(errorMessage(e, 'Failed to revoke sessions'));
    }
  };

  const columns: DataTableColumn[] = [
    {
      key: 'user',
      label: 'User',
      sortable: false,
      render: (_value, row) => {
        const s = row as unknown as Session;
        return s.user ? (
          <>
            <div>{s.user.email}</div>
            <div className={styles.userIdSubtext}>{s.userId}</div>
          </>
        ) : (
          s.userId
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: false,
      render: (_value, row) => formatDateTime((row as unknown as Session).createdAt),
    },
    {
      key: 'expiresAt',
      label: 'Expires',
      sortable: false,
      render: (_value, row) => formatDateTime((row as unknown as Session).expiresAt),
    },
    {
      key: 'familyId',
      label: 'Family',
      sortable: false,
      render: (_value, row) => {
        const s = row as unknown as Session;
        return <span title={s.familyId}>{s.familyId.slice(0, 8)}…</span>;
      },
    },
    {
      key: 'drilldown',
      label: 'Drill-down',
      sortable: false,
      render: (_value, row) => {
        const s = row as unknown as Session;
        return (
          <Stack direction='horizontal' spacing='xs'>
            <Button variant='ghost' size='sm' onClick={() => navigate('/security/ip-rules')}>
              IP rules
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() =>
                navigate(`/security/login-history?userId=${encodeURIComponent(s.userId)}`)
              }
            >
              Login history
            </Button>
          </Stack>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_value, row) => (
        <Button
          variant='danger'
          size='sm'
          onClick={() => handleRevoke((row as unknown as Session).sessionId)}
        >
          Revoke
        </Button>
      ),
    },
  ];

  return (
    <Section
      title='Active Sessions'
      description='Each entry represents a refresh-token family — a logged-in browser or device. Revoke a row to force that device to sign in again.'
    >
      <div className={styles.inlineForm}>
        <Input
          placeholder='Filter by user ID'
          aria-label='Filter by user ID'
          value={userIdFilter}
          onChange={e => setUserIdFilter(e.target.value)}
        />
        <Button variant='outline' onClick={() => void sessionsQuery.refetch()}>
          Refresh
        </Button>
        <Button variant='danger' onClick={handleRevokeAllForUser} disabled={!userIdFilter}>
          Revoke all for user
        </Button>
      </div>

      {sessionsQuery.isError ? (
        <ErrorState
          size='sm'
          message={errorMessage(sessionsQuery.error, 'Failed to load sessions')}
          onRetry={() => void sessionsQuery.refetch()}
        />
      ) : (
        <DataTable
          frameless
          columns={columns}
          rows={asRows(sessions)}
          loading={sessionsQuery.isLoading}
          emptyMessage='No active sessions match this filter.'
        />
      )}

      <ConfirmDialog {...confirmProps} />
    </Section>
  );
};

// ----- IP Rules -----

type IpRulesTabProps = { initialIp?: string };

const IP_RULE_TYPE_OPTIONS = [
  { value: 'block', label: 'Block' },
  { value: 'allow', label: 'Allow' },
];

const isIpRuleType = (value: string | string[]): value is IpRuleType =>
  value === 'block' || value === 'allow';

const IpRulesTab: React.FC<IpRulesTabProps> = ({ initialIp = '' }) => {
  const rulesQuery = useIpRules();
  const createIpRule = useCreateIpRule();
  const deleteIpRule = useDeleteIpRule();
  const [ipFilter, setIpFilter] = useState(initialIp);

  const [type, setType] = useState<IpRuleType>('block');
  const [cidr, setCidr] = useState('');
  const [label, setLabel] = useState('');
  const { confirm, confirmProps } = useConfirm();

  const visibleRules = useMemo(() => {
    const rules: IpRule[] = rulesQuery.data ?? [];
    const needle = ipFilter.trim().toLowerCase();
    if (!needle) {
      return rules;
    }
    return rules.filter(r => r.cidr.toLowerCase().includes(needle));
  }, [rulesQuery.data, ipFilter]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cidr.trim()) {
      return;
    }
    try {
      await createIpRule.mutateAsync({ type, cidr: cidr.trim(), label: label.trim() || null });
      setCidr('');
      setLabel('');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to create IP rule'));
    }
  };

  const handleDelete = async (ipRuleId: string) => {
    const confirmed = await confirm({
      title: 'Delete IP rule?',
      message:
        'Delete this IP rule? Removing a block rule may re-open access to matching addresses; removing an allow rule may lock out matching addresses. This action cannot be undone.',
      confirmText: 'Delete rule',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }
    try {
      await deleteIpRule.mutateAsync(ipRuleId);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to delete IP rule'));
    }
  };

  const columns: DataTableColumn[] = [
    {
      key: 'type',
      label: 'Type',
      sortable: false,
      render: (_value, row) => {
        const r = row as unknown as IpRule;
        return <StatusBadge variant={r.type === 'block' ? 'error' : 'success'} label={r.type} />;
      },
    },
    {
      key: 'cidr',
      label: 'CIDR',
      sortable: false,
      render: (_value, row) => <code>{(row as unknown as IpRule).cidr}</code>,
    },
    {
      key: 'label',
      label: 'Label',
      sortable: false,
      render: (_value, row) => (row as unknown as IpRule).label || '—',
    },
    {
      key: 'expiresAt',
      label: 'Expires',
      sortable: false,
      render: (_value, row) => {
        const r = row as unknown as IpRule;
        return r.expiresAt ? formatDateTime(r.expiresAt) : 'Never';
      },
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: false,
      render: (_value, row) => formatDateTime((row as unknown as IpRule).createdAt),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_value, row) => (
        <Button
          variant='danger'
          size='sm'
          onClick={() => handleDelete((row as unknown as IpRule).ipRuleId)}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <Section
      title='IP Restrictions'
      description={
        <>
          Block rules deny logins from matching addresses. If any allow rules exist, requests must
          match at least one to pass. Supports IPv4 single-address or CIDR (e.g.{' '}
          <code>10.0.0.0/8</code>) and IPv6 single-address.
        </>
      }
    >
      <div className={styles.inlineForm}>
        <Input
          placeholder='Filter rules by address'
          aria-label='Filter IP rules'
          value={ipFilter}
          onChange={e => setIpFilter(e.target.value)}
        />
        {ipFilter && (
          <Button variant='outline' onClick={() => setIpFilter('')}>
            Clear filter
          </Button>
        )}
      </div>

      <form className={styles.inlineForm} onSubmit={handleAdd}>
        <SelectInput
          label='Rule type'
          options={IP_RULE_TYPE_OPTIONS}
          value={type}
          onChange={next => isIpRuleType(next) && setType(next)}
        />
        <Input
          placeholder='IP or CIDR (e.g. 10.0.0.0/8)'
          aria-label='IP or CIDR'
          value={cidr}
          onChange={e => setCidr(e.target.value)}
          required
          aria-required={true}
        />
        <Input
          placeholder='Label (optional)'
          aria-label='Label'
          value={label}
          onChange={e => setLabel(e.target.value)}
        />
        <Button type='submit' variant='primary' disabled={createIpRule.isPending}>
          Add rule
        </Button>
      </form>

      {rulesQuery.isError ? (
        <ErrorState
          size='sm'
          message={errorMessage(rulesQuery.error, 'Failed to load IP rules')}
          onRetry={() => void rulesQuery.refetch()}
        />
      ) : (
        <DataTable
          frameless
          columns={columns}
          rows={asRows(visibleRules)}
          loading={rulesQuery.isLoading}
          emptyMessage={ipFilter ? `No IP rules match "${ipFilter}".` : 'No IP rules configured.'}
        />
      )}

      <ConfirmDialog {...confirmProps} />
    </Section>
  );
};

// ----- Login history -----

type LoginHistoryTabProps = { initialUserId?: string };
type LoginStatusFilter = 'all' | 'success' | 'failure';

const LOGIN_STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'success', label: 'Successes only' },
  { value: 'failure', label: 'Failures only' },
];

const isLoginStatusFilter = (value: string | string[]): value is LoginStatusFilter =>
  value === 'all' || value === 'success' || value === 'failure';

const loginStatusVariant = (
  status: LoginHistoryEntry['status']
): 'success' | 'error' | 'neutral' =>
  status === 'success' ? 'success' : status === 'failure' ? 'error' : 'neutral';

const LoginHistoryTab: React.FC<LoginHistoryTabProps> = ({ initialUserId = '' }) => {
  const navigate = useNavigate();
  const [userIdFilter, setUserIdFilter] = useState(initialUserId);
  const [statusFilter, setStatusFilter] = useState<LoginStatusFilter>('all');
  const historyQuery = useLoginHistory(userIdFilter, statusFilter);
  const entries: LoginHistoryEntry[] = historyQuery.data?.data ?? [];

  const columns: DataTableColumn[] = [
    {
      key: 'timestamp',
      label: 'When',
      sortable: false,
      render: (_value, row) => formatDateTime((row as unknown as LoginHistoryEntry).timestamp),
    },
    { key: 'action', label: 'Action', sortable: false },
    {
      key: 'status',
      label: 'Status',
      sortable: false,
      render: (_value, row) => {
        const entry = row as unknown as LoginHistoryEntry;
        return (
          <StatusBadge
            variant={loginStatusVariant(entry.status)}
            label={entry.status ?? 'unknown'}
          />
        );
      },
    },
    {
      key: 'user',
      label: 'User',
      sortable: false,
      render: (_value, row) => {
        const entry = row as unknown as LoginHistoryEntry;
        return entry.userEmail || entry.userId || '—';
      },
    },
    {
      key: 'ipAddress',
      label: 'IP',
      sortable: false,
      render: (_value, row) => {
        const { ipAddress } = row as unknown as LoginHistoryEntry;
        if (!ipAddress) {
          return '—';
        }
        return (
          <>
            {ipAddress}{' '}
            <Button
              variant='ghost'
              size='sm'
              onClick={() => navigate(`/security/ip-rules?ip=${encodeURIComponent(ipAddress)}`)}
            >
              IP rules
            </Button>
          </>
        );
      },
    },
  ];

  return (
    <Section
      title='Login History'
      description='Successful and failed authentication events for the last 30 days, captured from the audit log.'
    >
      <div className={styles.inlineForm}>
        <Input
          placeholder='Filter by user ID'
          aria-label='Filter by user ID'
          value={userIdFilter}
          onChange={e => setUserIdFilter(e.target.value)}
        />
        <SelectInput
          label='Filter by status'
          options={LOGIN_STATUS_OPTIONS}
          value={statusFilter}
          onChange={next => isLoginStatusFilter(next) && setStatusFilter(next)}
        />
      </div>

      {historyQuery.isError ? (
        <ErrorState
          size='sm'
          message={errorMessage(historyQuery.error, 'Failed to load login history')}
          onRetry={() => void historyQuery.refetch()}
        />
      ) : (
        <DataTable
          frameless
          columns={columns}
          rows={asRows(entries)}
          loading={historyQuery.isLoading}
          emptyMessage='No login events match these filters.'
        />
      )}
    </Section>
  );
};

// ----- Suspicious activity -----

const SuspiciousTab: React.FC = () => {
  const navigate = useNavigate();
  const [threshold, setThreshold] = useState(5);
  const [windowHours, setWindowHours] = useState(24);
  const activityQuery = useSuspiciousActivity(threshold, windowHours);
  const entries: SuspiciousActivityEntry[] = activityQuery.data ?? [];

  const columns: DataTableColumn[] = [
    {
      key: 'user',
      label: 'User',
      sortable: false,
      render: (_value, row) => {
        const entry = row as unknown as SuspiciousActivityEntry;
        return entry.userEmail || entry.userId || '(unidentified)';
      },
    },
    { key: 'failureCount', label: 'Failed attempts', sortable: false },
    {
      key: 'lastAttempt',
      label: 'Last attempt',
      sortable: false,
      render: (_value, row) =>
        formatDateTime((row as unknown as SuspiciousActivityEntry).lastAttempt),
    },
    {
      key: 'lastIp',
      label: 'Last IP',
      sortable: false,
      render: (_value, row) => (row as unknown as SuspiciousActivityEntry).lastIp || '—',
    },
    {
      key: 'drilldown',
      label: 'Drill-down',
      sortable: false,
      render: (_value, row) => {
        const entry = row as unknown as SuspiciousActivityEntry;
        return (
          <Stack direction='horizontal' spacing='xs'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() =>
                navigate(`/security/sessions?userId=${encodeURIComponent(entry.userId ?? '')}`)
              }
              disabled={!entry.userId}
              title={entry.userId ? 'View this user’s active sessions' : 'No user ID'}
            >
              Sessions
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() =>
                navigate(`/security/login-history?userId=${encodeURIComponent(entry.userId ?? '')}`)
              }
              disabled={!entry.userId}
              title={entry.userId ? 'View this user’s login history' : 'No user ID'}
            >
              Login history
            </Button>
          </Stack>
        );
      },
    },
  ];

  return (
    <Section
      title='Suspicious Activity'
      description='Accounts (or unidentified actors, by IP) with at least N failed logins in the selected window. The default threshold mirrors the auth-service lockout rule (5 failures triggers a 30-minute lockout) so anything flagged here is at imminent risk of being locked out.'
    >
      <div className={styles.inlineForm}>
        <FormField label='Threshold' htmlFor='suspicious-threshold'>
          <Input
            id='suspicious-threshold'
            type='number'
            min={1}
            value={threshold}
            onChange={e => setThreshold(Math.max(1, parseInt(e.target.value, 10) || 1))}
          />
        </FormField>
        <FormField label='Window (hours)' htmlFor='suspicious-window'>
          <Input
            id='suspicious-window'
            type='number'
            min={1}
            value={windowHours}
            onChange={e => setWindowHours(Math.max(1, parseInt(e.target.value, 10) || 1))}
          />
        </FormField>
      </div>

      {activityQuery.isError ? (
        <ErrorState
          size='sm'
          message={errorMessage(activityQuery.error, 'Failed to load suspicious activity')}
          onRetry={() => void activityQuery.refetch()}
        />
      ) : (
        <DataTable
          frameless
          columns={columns}
          rows={asRows(entries)}
          loading={activityQuery.isLoading}
          emptyMessage='No suspicious activity in this window.'
        />
      )}
    </Section>
  );
};

// ----- Recovery -----

const RecoveryTab: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const unlockAccount = useUnlockAccount();
  const forceLockAccount = useForceLockAccount();
  const { confirm, confirmProps } = useConfirm();

  const busy = unlockAccount.isPending || forceLockAccount.isPending;
  const isUserIdValid = useMemo(() => userId.trim().length > 0, [userId]);

  const handleUnlock = async () => {
    try {
      const result = await unlockAccount.mutateAsync(userId.trim());
      toast.success(
        result.wasLocked
          ? `Account ${userId.trim()} unlocked.`
          : `Account ${userId.trim()} was not locked; counter reset anyway.`
      );
    } catch (e) {
      toast.error(errorMessage(e, 'Failed to unlock account'));
    }
  };

  const handleForceLock = async () => {
    const confirmed = await confirm({
      title: 'Force-lock account?',
      message: `This will lock account ${userId.trim()} for 24 hours, blocking all sign-ins, and immediately revoke every active session. Only do this for suspected compromise. The user will need to rotate their credentials to regain access.`,
      confirmText: 'Force-lock & revoke',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }
    try {
      await forceLockAccount.mutateAsync({
        userId: userId.trim(),
        reason: reason.trim() || undefined,
      });
      toast.success(`Account ${userId.trim()} locked for 24h. All sessions revoked.`);
    } catch (e) {
      toast.error(errorMessage(e, 'Failed to lock account'));
    }
  };

  return (
    <Section
      title='Account Recovery & Takeover Prevention'
      description='If an account is suspected compromised, force-lock it (terminates all sessions and blocks sign-in for 24 hours) until the user has rotated their credentials. Use unlock to clear an automatic lockout once the user proves identity.'
    >
      <div className={styles.inlineForm}>
        <Input
          placeholder='User ID'
          aria-label='User ID'
          value={userId}
          onChange={e => setUserId(e.target.value)}
        />
        <Input
          placeholder='Reason (optional, for force-lock)'
          aria-label='Reason (optional, for force-lock)'
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <Button variant='primary' onClick={handleUnlock} disabled={!isUserIdValid || busy}>
          Unlock account
        </Button>
        <Button variant='danger' onClick={handleForceLock} disabled={!isUserIdValid || busy}>
          Force-lock & revoke
        </Button>
      </div>

      <ConfirmDialog {...confirmProps} />
    </Section>
  );
};

export default SecurityCenter;
