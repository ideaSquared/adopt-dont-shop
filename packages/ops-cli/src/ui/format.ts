import { isHiddenMarker, type CatalogResponse } from '@adopt-dont-shop/ops-contract';
import type { Theme } from './theme.js';

// Pure value formatting: dates, enums, ids, key/value blocks and tables.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENUM_VALUE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/;

export const isTimestamp = (value: string): boolean => ISO_TIMESTAMP.test(value);
export const isUuid = (value: string): boolean => UUID.test(value);

// "12 Oct 2026, 14:03" (en-GB). Month names are fixed so ICU versions cannot
// change them ("Sept").
export const formatTimestamp = (iso: string, timeZone?: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: 'numeric',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const month = MONTHS[Number(get('month')) - 1] ?? get('month');
  return `${get('day')} ${month} ${get('year')}, ${get('hour')}:${get('minute')}`;
};

export const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
};

// "7h 54m", "14 min", "under a minute", "expired"
export const formatTimeLeft = (expiresAtIso: string, nowMs: number): string => {
  const totalMinutes = Math.floor((new Date(expiresAtIso).getTime() - nowMs) / 60_000);
  if (totalMinutes < 0) {
    return 'expired';
  }
  if (totalMinutes < 1) {
    return 'under a minute';
  }
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
};

const toUpperSnake = (pascal: string): string =>
  pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();

// Longest "_"-delimited prefix shared by every value ("PET_STATUS_").
const commonPrefix = (values: readonly string[]): string => {
  const split = values.map(v => v.split('_'));
  const first = split[0] ?? [];
  const keep = first.findIndex(
    (seg, i) => i >= first.length - 1 || !split.every(s => s[i] === seg)
  );
  return keep <= 0 ? '' : `${first.slice(0, keep).join('_')}_`;
};

export const enumPrefix = (fullName: string, valueNames: readonly string[]): string => {
  const own = `${toUpperSnake(fullName.split('.').pop() ?? '')}_`;
  if (valueNames.every(v => v.startsWith(own))) {
    return own;
  }
  return valueNames.length > 1 ? commonPrefix(valueNames) : '';
};

export const shortEnumName = (fullName: string, valueNames: readonly string[], value: string) =>
  value.slice(enumPrefix(fullName, valueNames).length).toLowerCase() || value.toLowerCase();

// value name -> short lowercase name, for every enum in the catalog.
export type EnumShortNames = ReadonlyMap<string, string>;

export const buildEnumShortNames = (catalog: CatalogResponse): EnumShortNames =>
  new Map(
    Object.values(catalog.enums).flatMap(e => {
      const names = e.values.map(v => v.name);
      return names.map(n => [n, shortEnumName(e.fullName, names, n)] as const);
    })
  );

export type Tone = 'plain' | 'id' | 'ts' | 'enum' | 'hidden' | 'dim' | 'bool';
export type Cell = { readonly text: string; readonly tone: Tone };

export type FormatContext = {
  readonly theme: Theme;
  readonly enums: EnumShortNames;
  readonly columns: number;
  readonly timeZone?: string;
};

export const paint = (theme: Theme, cell: Cell): string => {
  if (cell.tone === 'id') {
    return theme.id(cell.text);
  }
  if (cell.tone === 'ts') {
    return theme.bold(cell.text);
  }
  if (cell.tone === 'enum') {
    return theme.brand(cell.text);
  }
  if (cell.tone === 'hidden') {
    return theme.hiddenMarker();
  }
  if (cell.tone === 'dim') {
    return theme.dim(cell.text);
  }
  if (cell.tone === 'bool') {
    return cell.text === 'yes' ? theme.ok(cell.text) : theme.dim(cell.text);
  }
  return cell.text;
};

export const cellOf = (
  value: unknown,
  ctx: Pick<FormatContext, 'enums' | 'timeZone' | 'theme'>
): Cell => {
  if (isHiddenMarker(value)) {
    return {
      text: `${ctx.theme.sym.hiddenOpen}hidden${ctx.theme.sym.hiddenClose}`,
      tone: 'hidden',
    };
  }
  if (value === null || value === undefined || value === '') {
    return { text: '-', tone: 'dim' };
  }
  if (typeof value === 'boolean') {
    return { text: value ? 'yes' : 'no', tone: 'bool' };
  }
  if (typeof value === 'number') {
    return { text: String(value), tone: 'plain' };
  }
  if (Array.isArray(value)) {
    return { text: summariseArray(value, ctx), tone: 'plain' };
  }
  if (typeof value === 'object') {
    return { text: '{…}', tone: 'dim' };
  }
  const text = String(value);
  if (isUuid(text)) {
    return { text, tone: 'id' };
  }
  if (isTimestamp(text)) {
    return { text: formatTimestamp(text, ctx.timeZone), tone: 'ts' };
  }
  if (ENUM_VALUE.test(text)) {
    return { text: ctx.enums.get(text) ?? text.toLowerCase(), tone: 'enum' };
  }
  return { text, tone: 'plain' };
};

const summariseArray = (
  items: readonly unknown[],
  ctx: Pick<FormatContext, 'enums' | 'timeZone' | 'theme'>
): string => {
  if (items.length === 0) {
    return '-';
  }
  const allScalar = items.every(i => typeof i !== 'object' || i === null);
  if (!allScalar) {
    return `[${items.length} items]`;
  }
  return items.map(i => cellOf(i, ctx).text).join(', ');
};

export const truncate = (text: string, width: number, ellipsis = '…'): string => {
  const chars = [...text];
  if (chars.length <= width) {
    return text;
  }
  if (width <= ellipsis.length) {
    return chars.slice(0, Math.max(width, 0)).join('');
  }
  return `${chars.slice(0, width - ellipsis.length).join('')}${ellipsis}`;
};

const len = (s: string): number => [...s].length;

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

type Row = Readonly<Record<string, unknown>>;

const isRecord = (v: unknown): v is Row =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !isHiddenMarker(v);

export const isRowArray = (v: unknown): v is readonly Row[] =>
  Array.isArray(v) && v.length > 0 && v.every(isRecord);

const columnPriority = (key: string): number => {
  if (key === 'id' || /Id$/.test(key)) {
    return 0;
  }
  if (/^(name|title|status|state|type|login|email)$/i.test(key)) {
    return 1;
  }
  return 2;
};

const MIN_COL = 10;
const MIN_KEPT_COLUMNS = 3;
const MAX_COL = 40;

export type TableLayout = {
  readonly keys: readonly string[];
  readonly widths: readonly number[];
  readonly dropped: number;
};

export const layoutTable = (
  rows: readonly Row[],
  ctx: FormatContext,
  available: number
): TableLayout => {
  const seen = rows.flatMap(r => Object.keys(r)).filter((k, i, all) => all.indexOf(k) === i);
  const scalarKeys = seen.filter(k =>
    rows.some(r => !isRecord(r[k]) && cellOf(r[k], ctx).text !== '-')
  );
  const ordered = [...scalarKeys].sort((a, b) => columnPriority(a) - columnPriority(b));
  const natural = (k: string) =>
    Math.min(MAX_COL, Math.max(len(headerLabel(k)), ...rows.map(r => len(cellOf(r[k], ctx).text))));
  const gaps = (n: number) => (n - 1) * 2;
  const fitsNaturally = (keys: readonly string[]) =>
    keys.reduce((sum, k) => sum + natural(k), 0) + gaps(keys.length) <= available;
  const dropUntilFits = (keys: readonly string[]): readonly string[] =>
    keys.length <= MIN_KEPT_COLUMNS || fitsNaturally(keys)
      ? keys
      : dropUntilFits(keys.slice(0, -1));
  const kept = dropUntilFits(ordered);
  const widths = shrinkToFit(kept.map(natural), available - gaps(kept.length));
  return { keys: kept, widths, dropped: scalarKeys.length - kept.length };
};

const shrinkToFit = (widths: readonly number[], budget: number): readonly number[] => {
  const total = widths.reduce((a, b) => a + b, 0);
  if (total <= budget) {
    return widths;
  }
  const widest = Math.max(...widths);
  if (widest <= MIN_COL) {
    return widths;
  }
  const index = widths.indexOf(widest);
  return shrinkToFit(
    widths.map((w, i) => (i === index ? w - 1 : w)),
    budget
  );
};

export const renderTable = (
  rows: readonly Row[],
  ctx: FormatContext,
  indent = 2
): readonly string[] => {
  const { theme } = ctx;
  const layout = layoutTable(rows, ctx, ctx.columns - indent);
  const pad = ' '.repeat(indent);
  const fit = (cell: Cell, width: number) => {
    const text = truncate(cell.text, width, theme.sym.ellipsis);
    return `${paint(theme, { ...cell, text })}${' '.repeat(Math.max(width - len(text), 0))}`;
  };
  const header = layout.keys
    .map((k, i) => {
      const text = truncate(headerLabel(k), layout.widths[i] ?? MIN_COL, theme.sym.ellipsis);
      return theme.dim(text.padEnd(layout.widths[i] ?? MIN_COL));
    })
    .join('  ');
  const body = rows.map(r =>
    `${pad}${layout.keys.map((k, i) => fit(cellOf(r[k], ctx), layout.widths[i] ?? MIN_COL)).join('  ')}`.trimEnd()
  );
  const more =
    layout.dropped > 0
      ? [
          `${pad}${theme.dim(`+${layout.dropped} more column${layout.dropped === 1 ? '' : 's'} (use --output json)`)}`,
        ]
      : [];
  return [`${pad}${header}`.trimEnd(), ...body, ...more];
};

// ---------------------------------------------------------------------------
// Key/value blocks
// ---------------------------------------------------------------------------

const MAX_DEPTH = 6;

// petId -> "PET ID", createdAt -> "CREATED AT"
export const headerLabel = (key: string): string =>
  key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toUpperCase();

export const renderValue = (
  value: unknown,
  ctx: FormatContext,
  indent = 2,
  depth = 0
): readonly string[] => {
  const pad = ' '.repeat(indent);
  if (isRecord(value)) {
    return renderRecord(value, ctx, indent, depth);
  }
  if (isRowArray(value)) {
    return renderTable(value, ctx, indent);
  }
  return [`${pad}${paint(ctx.theme, cellOf(value, ctx))}`];
};

const renderRecord = (
  value: Row,
  ctx: FormatContext,
  indent: number,
  depth: number
): readonly string[] => {
  const { theme } = ctx;
  const pad = ' '.repeat(indent);
  const entries = Object.entries(value);
  const keyWidth = Math.max(0, ...entries.filter(([, v]) => isScalarLike(v)).map(([k]) => len(k)));
  return entries.flatMap(([key, v], position): readonly string[] => {
    if (isScalarLike(v)) {
      return [formatEntry(key, v, keyWidth, pad, ctx)];
    }
    if (depth >= MAX_DEPTH) {
      return [`${pad}${theme.dim(key)}  ${theme.dim('{…}')}`];
    }
    const count = Array.isArray(v) ? ` ${theme.dim(`(${v.length})`)}` : '';
    const lead = position === 0 ? [] : [''];
    const trail = position === entries.length - 1 ? [] : [''];
    return [
      ...lead,
      `${pad}${theme.dim(key)}${count}`,
      ...renderValue(v, ctx, indent + 2, depth + 1),
      ...trail,
    ];
  });
};

const isScalarLike = (v: unknown): boolean =>
  isHiddenMarker(v) ||
  v === null ||
  typeof v !== 'object' ||
  (Array.isArray(v) && v.every(i => typeof i !== 'object' || i === null));

const formatEntry = (
  key: string,
  v: unknown,
  keyWidth: number,
  pad: string,
  ctx: FormatContext
): string => {
  const cell = cellOf(v, ctx);
  const [first = '', ...more] = cell.text.split('\n');
  const label = `${pad}${ctx.theme.dim(key.padEnd(keyWidth))}  `;
  const continuation = `${pad}${' '.repeat(keyWidth + 2)}`;
  const lines = [
    paint(ctx.theme, { ...cell, text: first }),
    ...more.map(l => `${continuation}${l}`),
  ];
  return `${label}${lines.join('\n')}`;
};

// Finds the first array-of-objects in a response, for `--output table`.
export const findRows = (value: unknown): readonly Row[] | undefined => {
  if (isRowArray(value)) {
    return value;
  }
  if (!isRecord(value)) {
    return undefined;
  }
  return Object.values(value)
    .map(findRows)
    .find(r => r !== undefined);
};
