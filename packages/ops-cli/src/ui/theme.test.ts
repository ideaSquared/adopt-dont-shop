import { describe, expect, it } from 'vitest';
import { createTheme, detectColor, detectUnicode, stripAnsi } from './theme.js';

describe('env badge', () => {
  const colored = createTheme({ color: true, unicode: true });
  const plain = createTheme({ color: false, unicode: true });

  it('is a green dot for dev, amber for staging, white-on-red block for prod', () => {
    expect(stripAnsi(colored.badge('dev'))).toBe('● dev');
    expect(stripAnsi(colored.badge('staging'))).toBe('● staging');
    expect(stripAnsi(colored.badge('prod'))).toBe(' PRODUCTION ');
    expect(colored.badge('dev')).toContain('\u001b[32m');
    expect(colored.badge('staging')).toContain('\u001b[33m');
    expect(colored.badge('prod')).toContain('\u001b[41m');
  });

  it('emits no escape codes when colour is off', () => {
    expect(plain.badge('prod')).toBe(' PRODUCTION ');
    expect(plain.brand('x')).toBe('x');
  });

  it('falls back to ASCII symbols on terminals without unicode', () => {
    const ascii = createTheme({ color: false, unicode: false });
    expect(ascii.badge('dev')).toBe('* dev');
    expect(ascii.sym.ok).toBe('v');
    expect(ascii.hiddenMarker()).toBe('<hidden>');
  });

  it('draws a full-width red banner', () => {
    const banner = plain.banner('PRODUCTION', 30);
    expect(banner).toHaveLength(30);
    expect(banner.trim()).toBe('PRODUCTION');
  });

  it('shows the device code big, one spaced character at a time', () => {
    const lines = plain.codeBlock('AB-12');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('A B - 1 2');
  });

  it('tags reads and writes', () => {
    expect(plain.tag('read')).toBe('READ ');
    expect(plain.tag('read', false)).toBe('READ');
    expect(plain.tag('write')).toBe('WRITE');
  });
});

describe('detectColor', () => {
  const base = { argv: [] as string[], env: {} as Record<string, string>, isTTY: true };

  it('is on for a TTY', () => {
    expect(detectColor(base)).toBe(true);
  });

  it('is off when piped, or for TERM=dumb', () => {
    expect(detectColor({ ...base, isTTY: false })).toBe(false);
    expect(detectColor({ ...base, env: { TERM: 'dumb' } })).toBe(false);
  });

  it('honours NO_COLOR and --no-color over everything', () => {
    expect(detectColor({ ...base, env: { NO_COLOR: '1', FORCE_COLOR: '1' } })).toBe(false);
    expect(detectColor({ ...base, argv: ['--no-color'], env: { FORCE_COLOR: '1' } })).toBe(false);
  });

  it('honours FORCE_COLOR even when piped, and FORCE_COLOR=0', () => {
    expect(detectColor({ ...base, isTTY: false, env: { FORCE_COLOR: '1' } })).toBe(true);
    expect(detectColor({ ...base, env: { FORCE_COLOR: '0' } })).toBe(false);
  });

  it('ignores an empty NO_COLOR', () => {
    expect(detectColor({ ...base, env: { NO_COLOR: '' } })).toBe(true);
  });
});

describe('detectUnicode', () => {
  it('is on for most unix terminals but not the Linux console', () => {
    expect(detectUnicode({ TERM: 'xterm' }, 'darwin')).toBe(true);
    expect(detectUnicode({ TERM: 'linux' }, 'linux')).toBe(false);
  });

  it('is off for legacy Windows consoles, on for Windows Terminal', () => {
    expect(detectUnicode({}, 'win32')).toBe(false);
    expect(detectUnicode({ WT_SESSION: 'abc' }, 'win32')).toBe(true);
  });
});
