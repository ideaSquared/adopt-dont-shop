import pc from 'picocolors';
import type { OpsEnv } from '@adopt-dont-shop/ops-contract';

// The one place colour and symbols are decided. Everything that renders goes
// through a Theme; nothing else in the CLI calls picocolors directly.

export type ThemeOptions = { readonly color: boolean; readonly unicode: boolean };

const UNICODE_SYMBOLS = {
  ok: '✔',
  fail: '✖',
  dot: '●',
  warn: '▲',
  arrow: '›',
  gutter: '│',
  rule: '─',
  ellipsis: '…',
  hiddenOpen: '‹',
  hiddenClose: '›',
  corner: '└',
  top: '┌',
};

const ASCII_SYMBOLS: typeof UNICODE_SYMBOLS = {
  ok: 'v',
  fail: 'x',
  dot: '*',
  warn: '!',
  arrow: '>',
  gutter: '|',
  rule: '-',
  ellipsis: '...',
  hiddenOpen: '<',
  hiddenClose: '>',
  corner: '`',
  top: ',',
};

export const createTheme = ({ color, unicode }: ThemeOptions) => {
  const c = pc.createColors(color);
  const sym = unicode ? UNICODE_SYMBOLS : ASCII_SYMBOLS;
  const paint = {
    brand: (s: string) => c.cyan(s),
    heading: (s: string) => c.bold(c.cyan(s)),
    dim: (s: string) => c.dim(s),
    bold: (s: string) => c.bold(s),
    ok: (s: string) => c.green(s),
    warn: (s: string) => c.yellow(s),
    err: (s: string) => c.red(s),
    write: (s: string) => c.magenta(s),
    read: (s: string) => c.cyan(s),
    id: (s: string) => c.dim(c.cyan(s)),
    hidden: (s: string) => c.magenta(s),
  };

  const badge = (env: OpsEnv): string => {
    if (env === 'prod') {
      return c.bold(c.bgRed(c.white(' PRODUCTION ')));
    }
    if (env === 'staging') {
      return c.bold(c.yellow(`${sym.dot} staging`));
    }
    return c.bold(c.green(`${sym.dot} dev`));
  };

  const tag = (kind: 'read' | 'write', padded = true): string =>
    kind === 'write' ? c.magenta('WRITE') : c.cyan(padded ? 'READ ' : 'READ');

  const banner = (text: string, width: number): string => {
    const inner =
      text.length >= width ? text : text.padStart(Math.floor((width + text.length) / 2));
    return c.bold(c.bgRed(c.white(inner.padEnd(width))));
  };

  const codeBlock = (code: string): readonly string[] => {
    const spaced = ` ${[...code].join(' ')} `;
    const pad = ' '.repeat(spaced.length + 4);
    const style = (s: string) => c.bold(c.bgCyan(c.black(s)));
    return [style(pad), style(`  ${spaced}  `), style(pad)];
  };

  const hiddenMarker = (): string => paint.hidden(`${sym.hiddenOpen}hidden${sym.hiddenClose}`);

  return { color, unicode, sym, ...paint, badge, tag, banner, codeBlock, hiddenMarker };
};

export type Theme = ReturnType<typeof createTheme>;

export const detectColor = (input: {
  readonly argv: readonly string[];
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly isTTY: boolean;
}): boolean => {
  if (input.argv.includes('--no-color')) {
    return false;
  }
  if (input.env.NO_COLOR !== undefined && input.env.NO_COLOR !== '') {
    return false;
  }
  const force = input.env.FORCE_COLOR;
  if (force !== undefined) {
    return force !== '0' && force !== 'false';
  }
  return input.isTTY && input.env.TERM !== 'dumb';
};

export const detectUnicode = (
  env: Readonly<Record<string, string | undefined>>,
  platform: string
): boolean => {
  if (platform !== 'win32') {
    return env.TERM !== 'linux';
  }
  return Boolean(env.WT_SESSION || env.TERM_PROGRAM || env.ConEmuTask === '{cmd::Cmder}');
};

const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
export const stripAnsi = (s: string): string => s.replace(ANSI_PATTERN, '');
