import { describe, expect, it } from 'vitest';
import { buildEnumShortNames } from './ui/format.js';
import {
  groupHiddenPaths,
  renderBody,
  renderChecks,
  renderCheckSummary,
  renderErrorBox,
  renderHeader,
  renderHiddenNotice,
  renderHistory,
  renderMethodHelp,
  renderOverallHelp,
  renderPlan,
  renderProdBanner,
  renderServiceList,
  renderSuccess,
  renderUnlockLine,
  renderWarning,
  renderWhoami,
  sensitivePaths,
  typeLabel,
} from './ui/render.js';
import { fieldSpecs } from './flags.js';
import { PET_ID, planResponse, sampleCatalog, sampleIndex } from './test-support.js';
import { createTheme, stripAnsi } from './ui/theme.js';
import type { InvokePlan } from '@adopt-dont-shop/ops-contract';

const theme = createTheme({ color: false, unicode: true });
const fmt = { theme, enums: buildEnumShortNames(sampleCatalog), columns: 100, timeZone: 'UTC' };
const text = (lines: readonly string[]) => stripAnsi(lines.join('\n'));
const plan = (extra: Record<string, unknown> = {}) => planResponse(extra) as unknown as InvokePlan;
const service = sampleIndex.service('pets');
if (!service) {
  throw new Error('fixture');
}

describe('chrome', () => {
  it('starts with the env badge', () => {
    expect(text(renderHeader(theme, 'staging', 'pets.List'))).toContain('● staging  pets.List');
  });

  it('boxes errors with code, message and hint', () => {
    const out = text(
      renderErrorBox(theme, { code: 'NOT_FOUND', message: 'pet not found', hint: 'check the id' })
    );
    expect(out).toBe(
      ['  ┌─ ✖ NOT_FOUND', '  │  pet not found', '  │', '  │  › check the id', '  └', ''].join('\n')
    );
    expect(text(renderErrorBox(theme, { message: 'a\nb' }))).toContain('✖ Error');
  });

  it('shows a full-width prod banner', () => {
    const lines = renderProdBanner(theme, 50);
    expect(lines.every(l => l.length === 50)).toBe(true);
    expect(text(lines)).toContain('PRODUCTION');
  });

  it('marks success and warnings', () => {
    expect(text(renderSuccess(theme, 'Done'))).toBe('  ✔ Done');
    expect(text(renderWarning(theme, 'Careful'))).toBe('  ▲ Careful');
  });
});

describe('help', () => {
  it('overall help is short, scannable and has examples', () => {
    const out = text(renderOverallHelp(theme));
    expect(out.split('\n').length).toBeLessThan(60);
    ['GET STARTED', 'EXPLORE', 'EXAMPLES', 'OTHER COMMANDS', 'OPTIONS'].forEach(h =>
      expect(out).toContain(h)
    );
    expect(out).toContain('pnpm ops pets get --help');
  });

  it('lists a service with aligned commands, READ/WRITE tags and summaries', () => {
    const lines = renderServiceList(theme, service, 100).map(stripAnsi);
    const list = lines.find(l => l.includes('update-status'));
    expect(list).toMatch(/update-status\s+WRITE\s+Change status/);
    const find = lines.find(l => l.includes('find-owner'));
    expect(find?.indexOf('READ')).toBe(list?.indexOf('WRITE'));
  });

  it('explains a write command: fields, enum values, dry-run mode', () => {
    const method = service.methods.find(m => m.command === 'update-status');
    if (!method) {
      throw new Error('fixture');
    }
    const out = text(renderMethodHelp(theme, sampleIndex, service, method));
    expect(out).toContain('pnpm ops pets update-status [pet-id] [flags]');
    expect(out).toMatch(/--pet-id <string>\s+required/);
    expect(out).toContain('--status <enum>');
    expect(out).toContain('unspecified | available | adopted');
    expect(out).toContain('--notify-adopter <bool>');
    expect(out).toContain('Dry-run mode: rollback');
    expect(out).toContain('Hidden in the response unless unlocked: pets.ownerEmail');
  });

  it('calls out PII lookups and nested fields', () => {
    const find = service.methods.find(m => m.command === 'find-owner');
    const list = service.methods.find(m => m.command === 'list');
    if (!find || !list) {
      throw new Error('fixture');
    }
    expect(text(renderMethodHelp(theme, sampleIndex, service, find))).toContain(
      'PII lookup: setting --owner_email'
    );
    expect(text(renderMethodHelp(theme, sampleIndex, service, list))).toContain(
      'nested: use --json'
    );
  });

  it('finds sensitive paths through nested messages, once per message', () => {
    expect(sensitivePaths(sampleIndex, 'adopt_dont_shop.pets.v1.ListResponse')).toEqual([
      'pets.ownerEmail',
    ]);
    expect(sensitivePaths(sampleIndex, 'missing')).toEqual([]);
  });

  it('labels field types', () => {
    const list = service.methods.find(m => m.command === 'list');
    const specs = list ? fieldSpecs(sampleIndex, list) : [];
    expect(specs.map(typeLabel)).toEqual(['enum', 'int', 'string[]', 'bool', 'json']);
  });
});

describe('plans', () => {
  it('shows the dry-run header, request, would-be response and expiry', () => {
    const out = text(renderPlan(plan(), fmt));
    expect(out).toContain('DRY RUN - rolled back, nothing changed');
    expect(out).toContain(`petId   ${PET_ID}`);
    expect(out).toContain('status  adopted');
    expect(out).toContain('Would respond');
    expect(out).toContain('Plan valid until 12 Oct 2026, 14:13');
  });

  it('distinguishes native and preview-only previews', () => {
    expect(text(renderPlan(plan({ dryRun: 'native' }), fmt))).toContain('simulated by the service');
    const only = text(
      renderPlan(plan({ dryRun: 'preview-only', response: null, warnings: ['sends email'] }), fmt)
    );
    expect(only).toContain('PREVIEW ONLY - not simulated');
    expect(only).toContain('▲ sends email');
    expect(only).not.toContain('Would respond');
  });
});

describe('results', () => {
  it('summarises hidden paths instead of listing every row', () => {
    expect(groupHiddenPaths(['u[0].email', 'u[1].email', 'u[0].phone'])).toEqual([
      'u[].email (x2)',
      'u[].phone',
    ]);
    const out = text(renderHiddenNotice(theme, ['a', 'b', 'c', 'd', 'e', 'f']));
    expect(out).toContain('6 fields hidden');
    expect(out).toContain('+2 more');
  });

  it('says when a response is empty', () => {
    expect(text(renderBody({}, fmt, undefined))).toContain('(empty response)');
    expect(text(renderBody(null, fmt, undefined))).toContain('(empty response)');
  });

  it('renders history rows and the empty case', () => {
    expect(text(renderHistory([], fmt))).toContain('No history yet.');
    const out = text(
      renderHistory(
        [
          {
            at: '2026-10-12T14:03:00.000Z',
            rpc: 'pets.List',
            kind: 'read',
            mode: 'run',
            outcome: 'error',
            errorCode: 'NOT_FOUND',
            revealedFields: ['a'],
          },
        ],
        fmt
      )
    );
    expect(out).toContain('not_found');
    expect(out).toContain('pets.List');
  });

  it('renders whoami and unlock lines', () => {
    const unlock = {
      unlockId: '33333333-3333-4333-8333-333333333333',
      subjectType: 'user' as const,
      subjectId: 'u-1',
      reason: 'r',
      ticket: 'ADS-9',
      createdAt: '2026-10-12T13:30:00.000Z',
      expiresAt: '2026-10-12T14:30:00.000Z',
    };
    const out = text(
      renderWhoami(
        theme,
        {
          env: 'dev',
          operator: {
            operatorId: '22222222-2222-4222-8222-222222222222',
            login: 'alice',
            name: 'Alice',
          },
          sessionExpiresAt: '2026-10-12T22:00:00.000Z',
          unlocks: [unlock],
        },
        Date.parse('2026-10-12T14:00:00Z'),
        'UTC'
      )
    );
    expect(out).toContain('alice (Alice)');
    expect(out).toContain('user u-1  ADS-9  30 min left');
    expect(
      stripAnsi(
        renderUnlockLine(theme, { ...unlock, subjectType: 'any', subjectId: null }, 0, 'UTC')
      )
    ).toContain('any  ADS-9');
  });

  it('summarises doctor checks', () => {
    const ok = [{ name: 'A', status: 'ok' as const }];
    expect(text(renderCheckSummary(theme, ok))).toContain('Everything looks good.');
    expect(
      text(renderCheckSummary(theme, [...ok, { name: 'B', status: 'warn' as const }]))
    ).toContain('1 warning');
    expect(
      text(
        renderCheckSummary(theme, [
          { name: 'B', status: 'fail' as const },
          { name: 'C', status: 'fail' as const },
        ])
      )
    ).toContain('2 problems found.');
    expect(
      text(renderChecks(theme, [{ name: 'Server', status: 'skip', detail: 'needs the server' }]))
    ).toContain('- Server');
  });
});
