import type {
  CatalogMethod,
  CatalogService,
  HistoryEntry,
  InvokePlan,
  OpsEnv,
  Unlock,
  WhoamiResponse,
} from '@adopt-dont-shop/ops-contract';
import type { CatalogIndex } from '../catalog.js';
import { fieldSpecs, isRequired, positionalField, type FieldSpec } from '../flags.js';
import {
  formatDuration,
  formatTimeLeft,
  formatTimestamp,
  renderTable,
  renderValue,
  truncate,
  type FormatContext,
} from './format.js';
import type { Theme } from './theme.js';

// Pure renderers: data in, an array of lines out. No IO, no colour calls
// outside the theme.

export type Lines = readonly string[];

const IND = '  ';
const len = (s: string): number => [...s].length;

export const renderHeader = (theme: Theme, env: OpsEnv, subtitle?: string): Lines => [
  '',
  `${IND}${theme.badge(env)}${subtitle ? `  ${theme.dim(subtitle)}` : ''}`,
  '',
];

export const renderFooter = (theme: Theme, durationMs: number): Lines => [
  '',
  `${IND}${theme.dim(formatDuration(durationMs))}`,
];

export const renderSuccess = (theme: Theme, text: string): Lines => [
  `${IND}${theme.ok(theme.sym.ok)} ${theme.bold(text)}`,
];

export const renderWarning = (theme: Theme, text: string): Lines => [
  `${IND}${theme.warn(theme.sym.warn)} ${theme.warn(text)}`,
];

export const renderProdBanner = (theme: Theme, width: number): Lines => [
  theme.banner('', width),
  theme.banner('PRODUCTION  -  changes here are real', width),
  theme.banner('', width),
];

export const renderErrorBox = (
  theme: Theme,
  error: { readonly code?: string; readonly message: string; readonly hint?: string }
): Lines => {
  const g = theme.err(theme.sym.gutter);
  const title = error.code ? `${theme.sym.fail} ${error.code}` : `${theme.sym.fail} Error`;
  return [
    `${IND}${theme.err(`${theme.sym.top}${theme.sym.rule} `)}${theme.bold(theme.err(title))}`,
    ...error.message.split('\n').map(l => `${IND}${g}  ${l}`),
    ...(error.hint
      ? [`${IND}${g}`, `${IND}${g}  ${theme.dim(`${theme.sym.arrow} ${error.hint}`)}`]
      : []),
    `${IND}${theme.err(theme.sym.corner)}`,
    '',
  ];
};

// ---------------------------------------------------------------------------
// Help and discovery
// ---------------------------------------------------------------------------

const section = (theme: Theme, title: string): string => `${IND}${theme.heading(title)}`;

const row = (theme: Theme, left: string, right: string, width: number): string =>
  `${IND}${IND}${theme.bold(left)}${' '.repeat(Math.max(width - len(left), 0) + 2)}${right}`;

export const renderOverallHelp = (theme: Theme): Lines => {
  const cmd = (c: string) => theme.bold(c);
  const dim = theme.dim;
  const rows = (items: readonly (readonly [string, string])[]) => {
    const w = Math.max(...items.map(([l]) => len(l)));
    return items.map(([l, r]) => row(theme, l, r, w));
  };
  return [
    '',
    `${IND}${theme.heading('ads-ops')}  ${dim('run allow-listed RPCs on dev, staging and prod')}`,
    '',
    section(theme, 'USAGE'),
    `${IND}${IND}pnpm ops ${cmd('<service> <command>')} ${dim('[id] [--flags]')}`,
    '',
    section(theme, 'GET STARTED'),
    ...rows([
      ['setup', 'Configure SSH access for staging / prod (dev needs nothing)'],
      ['login', 'Sign in to the current environment'],
      ['use <env>', 'Switch environment: dev, staging or prod'],
    ]),
    '',
    section(theme, 'EXPLORE'),
    ...rows([
      ['pnpm ops', 'Interactive browser (pick a service, a command, fill in fields)'],
      ['pnpm ops pets', "List a service's commands"],
      ['pnpm ops pets get --help', "Show one command's flags and safety notes"],
    ]),
    '',
    section(theme, 'EXAMPLES'),
    `${IND}${IND}${dim('$')} pnpm ops pets list --status available`,
    `${IND}${IND}${dim('$')} pnpm ops pets get 0b1c2d3e-...`,
    `${IND}${IND}${dim('$')} pnpm ops pets update-status <id> --status adopted   ${dim('# previews first')}`,
    `${IND}${IND}${dim('$')} pnpm ops pets list -o json | jq '.pets[].name'`,
    '',
    section(theme, 'OTHER COMMANDS'),
    ...rows([
      ['whoami', 'Who you are, session expiry, active unlocks'],
      [
        'unlock <user|rescue|application> <id>',
        'Reveal hidden personal data (reason + ticket, alerts #ops)',
      ],
      ['unlock any', 'Reveal hidden data on every command for a while'],
      ['lock', 'Revoke your unlocks'],
      ['history', 'Your recent commands (server side)'],
      ['again', 'Re-run your last command (writes preview again)'],
      ['tunnel status|stop', 'Manage the SSH tunnel'],
      ['doctor', 'Check config, tunnel, session, clock'],
      ['completion <zsh|bash|fish>', 'Shell completion'],
      ['logout', 'Forget this environment session'],
    ]),
    '',
    section(theme, 'OPTIONS'),
    ...rows([
      ['-e, --env <env>', 'Use this environment for one command (or set ADS_OPS_ENV)'],
      ['-o, --output <mode>', 'pretty (default), table or json'],
      ['--json <object>', 'Request fields as JSON (needed for nested fields)'],
      ['-y, --yes', 'Run a write without asking (dev and staging, never prod)'],
      ['--refresh', 'Re-fetch the command catalog'],
      ['--no-color', 'Plain output (NO_COLOR works too)'],
      ['-h, --help', 'Show help (also: pnpm ops help <service> [command])'],
      ['-v, --version', 'Show the version'],
    ]),
    '',
  ];
};

export const renderServiceList = (theme: Theme, service: CatalogService, width: number): Lines => {
  const left = Math.max(...service.methods.map(m => len(m.command)), 7);
  const summaryWidth = Math.max(width - left - 14, 20);
  return [
    `${IND}${theme.heading(service.name)}  ${theme.dim(`${service.methods.length} commands`)}`,
    '',
    ...service.methods.map(
      m =>
        `${IND}${IND}${theme.bold(m.command.padEnd(left))}  ${theme.tag(m.kind)}  ${truncate(m.summary, summaryWidth, theme.sym.ellipsis)}`
    ),
    '',
    `${IND}${theme.dim(`Details: pnpm ops ${service.name} <command> --help`)}`,
    '',
  ];
};

export const typeLabel = (spec: FieldSpec): string => {
  const base =
    spec.type === 'enum'
      ? 'enum'
      : spec.type === 'json'
        ? 'json'
        : spec.type === 'boolean'
          ? 'bool'
          : spec.type === 'integer'
            ? 'int'
            : spec.type;
  return spec.field.repeated ? `${base}[]` : base;
};

const SENSITIVE = new Set(['PII', 'SPECIAL']);

// Dotted paths of annotated-sensitive fields in a message tree.
export const sensitivePaths = (
  index: CatalogIndex,
  messageName: string,
  prefix = '',
  seen: readonly string[] = [],
  depth = 0
): readonly string[] => {
  const message = index.message(messageName);
  if (!message || seen.includes(messageName) || depth > 4) {
    return [];
  }
  return message.fields.flatMap(f => {
    const path = `${prefix}${f.jsonName}`;
    if (f.sensitivity && SENSITIVE.has(f.sensitivity)) {
      return [path];
    }
    if (f.kind !== 'message' || !f.typeName) {
      return [];
    }
    return sensitivePaths(index, f.typeName, `${path}.`, [...seen, messageName], depth + 1);
  });
};

const dryRunExplanation = (mode: NonNullable<CatalogMethod['dryRun']>): string => {
  if (mode === 'rollback') {
    return 'rollback - runs for real inside a transaction that is always rolled back';
  }
  if (mode === 'native') {
    return 'native - the service simulates it itself';
  }
  return 'preview-only - nothing is called; you see the validated request only (it has side effects outside the database)';
};

export const renderMethodHelp = (
  theme: Theme,
  index: CatalogIndex,
  service: CatalogService,
  method: CatalogMethod
): Lines => {
  const specs = fieldSpecs(index, method);
  const target = positionalField(specs);
  const usage = `pnpm ops ${service.name} ${method.command}${target ? ` [${target.flag}]` : ''} [flags]`;
  const labelOf = (s: FieldSpec) => `--${s.flag} <${typeLabel(s)}>`;
  const width = Math.max(0, ...specs.map(s => len(labelOf(s))));
  const flagRows = specs.map(s => {
    const notes = [
      isRequired(s) ? theme.warn('required') : '',
      s.type === 'enum' ? s.shortEnumValues.join(' | ') : '',
      s.type === 'json' ? 'nested: use --json' : '',
      s.field.sensitivity && SENSITIVE.has(s.field.sensitivity)
        ? theme.hidden(s.field.sensitivity)
        : '',
      s.field.comment ? theme.dim(s.field.comment) : '',
    ].filter(n => n !== '');
    return row(theme, labelOf(s), notes.join('  '), width).trimEnd();
  });
  const outputSensitive = sensitivePaths(index, method.outputType);
  const requestPii = method.piiRequestFields;
  return [
    `${IND}${theme.heading(`${service.name} ${method.command}`)}  ${theme.tag(method.kind, false)}`,
    `${IND}${method.summary}`,
    '',
    section(theme, 'USAGE'),
    `${IND}${IND}${usage}`,
    '',
    ...(specs.length > 0 ? [section(theme, 'FIELDS'), ...flagRows, ''] : []),
    section(theme, 'SAFETY'),
    ...(method.kind === 'read'
      ? [`${IND}${IND}Read-only. Personal data is hidden unless you have an unlock.`]
      : [
          `${IND}${IND}Writes preview first. Nothing changes until you confirm.`,
          `${IND}${IND}Dry-run mode: ${dryRunExplanation(method.dryRun ?? 'preview-only')}`,
        ]),
    ...(requestPii.length > 0
      ? [
          `${IND}${IND}${theme.hidden('PII lookup')}: setting ${requestPii.map(f => `--${f}`).join(', ')} offers an unlock before calling.`,
        ]
      : []),
    ...(outputSensitive.length > 0
      ? [
          `${IND}${IND}Hidden in the response unless unlocked: ${theme.dim(outputSensitive.join(', '))}`,
        ]
      : []),
    '',
    section(theme, 'OPTIONS'),
    `${IND}${IND}${theme.dim('-e/--env, -o/--output json|table|pretty, --json <object>, -y/--yes, --refresh')}`,
    '',
  ];
};

// ---------------------------------------------------------------------------
// Results and plans
// ---------------------------------------------------------------------------

// "pets[0].contactEmail" x4 collapses to "pets[].contactEmail (x4)".
export const groupHiddenPaths = (hidden: readonly string[]): readonly string[] => {
  const counts = hidden
    .map(p => p.replace(/\[\d+\]/g, '[]'))
    .reduce<
      ReadonlyMap<string, number>
    >((acc, p) => new Map([...acc, [p, (acc.get(p) ?? 0) + 1]]), new Map());
  return [...counts].map(([path, n]) => (n > 1 ? `${path} (x${n})` : path));
};

export const renderHiddenNotice = (theme: Theme, hidden: readonly string[]): Lines => {
  const groups = groupHiddenPaths(hidden);
  const shown = groups.slice(0, 4).join(', ');
  const more = groups.length > 4 ? `, +${groups.length - 4} more` : '';
  return [
    '',
    `${IND}${theme.hidden(theme.sym.warn)} ${theme.hidden(`${hidden.length} field${hidden.length === 1 ? '' : 's'} hidden`)}  ${theme.dim(`${shown}${more}`)}`,
  ];
};

export const renderBody = (
  response: unknown,
  ctx: FormatContext,
  rows: readonly Record<string, unknown>[] | undefined
): Lines => {
  if (rows) {
    return [
      `${IND}${ctx.theme.dim(`${rows.length} row${rows.length === 1 ? '' : 's'}`)}`,
      '',
      ...renderTable(rows, ctx),
    ];
  }
  const empty =
    response === undefined ||
    response === null ||
    (typeof response === 'object' && Object.keys(response).length === 0);
  if (empty) {
    return [`${IND}${ctx.theme.dim('(empty response)')}`];
  }
  return renderValue(response, ctx);
};

const planTitle = (plan: InvokePlan): { text: string; warn: boolean } => {
  if (plan.dryRun === 'preview-only') {
    return { text: 'PREVIEW ONLY - not simulated', warn: true };
  }
  if (plan.dryRun === 'native') {
    return { text: 'DRY RUN - simulated by the service, nothing changed', warn: false };
  }
  return { text: 'DRY RUN - rolled back, nothing changed', warn: false };
};

export const renderPlan = (plan: InvokePlan, ctx: FormatContext): Lines => {
  const { theme } = ctx;
  const title = planTitle(plan);
  const paint = title.warn ? theme.warn : theme.write;
  const heading = (t: string) => `${IND}${theme.dim(t)}`;
  return [
    `${IND}${paint(title.warn ? theme.sym.warn : theme.sym.dot)} ${theme.bold(paint(title.text))}`,
    `${IND}${theme.dim(plan.rpc)}`,
    '',
    heading('Request'),
    ...renderValue(plan.request, ctx, 4),
    ...(plan.response !== null
      ? ['', heading('Would respond'), ...renderValue(plan.response, ctx, 4)]
      : []),
    ...(plan.warnings.length > 0
      ? [
          '',
          heading('Warnings'),
          ...plan.warnings.map(w => `    ${theme.warn(`${theme.sym.warn} ${w}`)}`),
        ]
      : []),
    '',
    `${IND}${theme.dim(`Plan valid until ${formatTimestamp(plan.expiresAt, ctx.timeZone)}`)}`,
  ];
};

// ---------------------------------------------------------------------------
// whoami, history
// ---------------------------------------------------------------------------

export const renderUnlockLine = (
  theme: Theme,
  unlock: Unlock,
  nowMs: number,
  timeZone?: string
): string => {
  const subject =
    unlock.subjectType === 'any'
      ? 'any'
      : `${unlock.subjectType} ${theme.id(unlock.subjectId ?? '')}`;
  return `${IND}${IND}${theme.hidden(theme.sym.dot)} ${subject}  ${unlock.ticket}  ${theme.dim(`${formatTimeLeft(unlock.expiresAt, nowMs)} left, until ${formatTimestamp(unlock.expiresAt, timeZone)}`)}`;
};

export const renderWhoami = (
  theme: Theme,
  who: WhoamiResponse,
  nowMs: number,
  timeZone?: string
): Lines => {
  const label = (k: string) => theme.dim(k.padEnd(10));
  const name = who.operator.name ? ` ${theme.dim(`(${who.operator.name})`)}` : '';
  return [
    `${IND}${label('Operator')}${theme.bold(who.operator.login)}${name}`,
    `${IND}${label('Env')}${who.env}`,
    `${IND}${label('Session')}expires ${formatTimestamp(who.sessionExpiresAt, timeZone)} ${theme.dim(`(in ${formatTimeLeft(who.sessionExpiresAt, nowMs)})`)}`,
    '',
    who.unlocks.length === 0
      ? `${IND}${label('Unlocks')}${theme.dim('none - personal data is hidden')}`
      : `${IND}${theme.dim('Unlocks')}`,
    ...who.unlocks.map(u => renderUnlockLine(theme, u, nowMs, timeZone)),
  ];
};

export const renderHistory = (entries: readonly HistoryEntry[], ctx: FormatContext): Lines => {
  if (entries.length === 0) {
    return [`${IND}${ctx.theme.dim('No history yet.')}`];
  }
  return renderTable(
    entries.map(e => ({
      at: e.at,
      rpc: e.rpc,
      kind: e.kind,
      mode: e.mode,
      outcome: e.outcome,
      error: e.errorCode ?? undefined,
      revealed: e.revealedFields.length > 0 ? e.revealedFields : undefined,
    })),
    { ...ctx, columns: Math.max(ctx.columns, 60) }
  );
};

// ---------------------------------------------------------------------------
// doctor
// ---------------------------------------------------------------------------

export type CheckStatus = 'ok' | 'fail' | 'warn' | 'skip';
export type Check = {
  readonly name: string;
  readonly status: CheckStatus;
  readonly detail?: string;
};

export const renderChecks = (theme: Theme, checks: readonly Check[]): Lines => {
  const width = Math.max(...checks.map(c => len(c.name)));
  const mark = (s: CheckStatus) =>
    s === 'ok'
      ? theme.ok(theme.sym.ok)
      : s === 'fail'
        ? theme.err(theme.sym.fail)
        : s === 'warn'
          ? theme.warn(theme.sym.warn)
          : theme.dim('-');
  return checks.map(c =>
    `${IND}${mark(c.status)} ${c.name.padEnd(width)}  ${theme.dim(c.detail ?? '')}`.trimEnd()
  );
};

export const renderCheckSummary = (theme: Theme, checks: readonly Check[]): Lines => {
  const failed = checks.filter(c => c.status === 'fail').length;
  const warned = checks.filter(c => c.status === 'warn').length;
  if (failed > 0) {
    return [`${IND}${theme.err(`${failed} problem${failed === 1 ? '' : 's'} found.`)}`];
  }
  if (warned > 0) {
    return [`${IND}${theme.warn(`All set, with ${warned} warning${warned === 1 ? '' : 's'}.`)}`];
  }
  return [`${IND}${theme.ok('Everything looks good.')}`];
};

export const renderBanner = (theme: Theme): Lines => [
  '',
  `${IND}${theme.heading(`${theme.sym.top}  ads-ops`)}`,
  `${IND}${theme.dim(theme.sym.gutter)}  ${theme.dim('Run allow-listed RPCs on dev, staging and prod.')}`,
];
