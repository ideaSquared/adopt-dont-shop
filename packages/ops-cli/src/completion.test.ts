import { describe, expect, it } from 'vitest';
import { complete, completionScript } from './commands/completion.js';
import { sampleIndex } from './test-support.js';

describe('shell completion candidates', () => {
  it('completes builtins and services first', () => {
    const all = complete([''], sampleIndex);
    expect(all).toContain('pets');
    expect(all).toContain('setup');
    expect(complete(['wh'], sampleIndex)).toEqual(['whoami']);
  });

  it('completes commands of a service', () => {
    expect(complete(['pets', ''], sampleIndex)).toEqual(['find-owner', 'list', 'update-status']);
    expect(complete(['pets', 'up'], sampleIndex)).toEqual(['update-status']);
  });

  it('completes flags of a command, with --no- twins for booleans, plus globals', () => {
    const flags = complete(['pets', 'list', '--'], sampleIndex);
    expect(flags).toContain('--status');
    expect(flags).toContain('--no-include-archived');
    expect(flags).toContain('--env');
    expect(flags).not.toContain('--filter');
  });

  it('completes enum values after an enum flag', () => {
    expect(complete(['pets', 'list', '--status', ''], sampleIndex)).toEqual([
      'adopted',
      'available',
      'unspecified',
    ]);
  });

  it('completes environments and output modes', () => {
    expect(complete(['-e', ''], sampleIndex)).toEqual(['dev', 'prod', 'staging']);
    expect(complete(['pets', 'list', '--output', 'j'], sampleIndex)).toEqual(['json']);
    expect(complete(['use', ''], sampleIndex)).toEqual(['dev', 'prod', 'staging']);
  });

  it('completes subcommands of builtins', () => {
    expect(complete(['unlock', ''], sampleIndex)).toEqual(['any', 'application', 'rescue', 'user']);
    expect(complete(['tunnel', ''], sampleIndex)).toEqual(['status', 'stop']);
    expect(complete(['completion', ''], sampleIndex)).toEqual(['bash', 'fish', 'zsh']);
  });

  it('skips global value flags when counting positionals', () => {
    expect(complete(['-e', 'prod', 'pets', ''], sampleIndex)).toContain('list');
  });

  it('still completes builtins without a cached catalog', () => {
    expect(complete([''], undefined)).toContain('login');
    expect(complete(['pets', ''], undefined)).toEqual([]);
  });

  it('offers nothing after a value flag that takes free text', () => {
    expect(complete(['pets', 'list', '--limit', ''], sampleIndex)).toEqual([]);
    expect(complete(['pets', 'nope', '--'], sampleIndex)).toEqual([]);
  });
});

describe('completion scripts', () => {
  it('generates scripts for each shell that call __complete', () => {
    ['zsh', 'bash', 'fish'].forEach(shell => {
      const script = completionScript(shell, '/my repo');
      expect(script).toContain('__complete');
      expect(script).toContain("'/my repo/packages/ops-cli/src/bin.ts'");
      expect(script).toContain('ads-ops');
    });
  });

  it('rejects unknown shells with an example', () => {
    expect(() => completionScript('powershell', '/r')).toThrow(/Unknown shell/);
  });
});
