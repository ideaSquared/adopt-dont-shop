import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

// Drift guard for every `<domain>.actionTaken` publisher in the monorepo. The audit
// subscriber does no validation: a payload without a uuid eventId / aggregateId, an
// outcome or an occurredAt makes the INSERT throw, so the message is retried and then
// dead-lettered and the audit record is never written. Each publisher's own test pushes
// its real payload through persistAuditEvent; this guard additionally fails when a NEW
// publisher is added without stamping the fields the audit_events table requires.

const SERVICES_DIR = join(import.meta.dirname, '../../..');
const PUBLISH_SITE = /type:\s*'[a-z]+\.actionTaken'/;
const REQUIRED_FIELDS = ['eventId:', 'outcome:', 'occurredAt:', 'aggregateId:'] as const;

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === 'node_modules' || name === 'generated' ? [] : sourceFiles(path);
    }
    const isSource = name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.d.ts');
    return isSource ? [path] : [];
  });

const publisherFiles = readdirSync(SERVICES_DIR)
  .filter(name =>
    statSync(join(SERVICES_DIR, name, 'src'), { throwIfNoEntry: false })?.isDirectory()
  )
  .flatMap(name => sourceFiles(join(SERVICES_DIR, name, 'src')))
  .filter(file => PUBLISH_SITE.test(readFileSync(file, 'utf8')))
  .map(file => relative(SERVICES_DIR, file));

describe('actionTaken publishers', () => {
  it('finds the publishers (guards against the scan silently matching nothing)', () => {
    expect(publisherFiles.length).toBeGreaterThanOrEqual(15);
  });

  it.each(publisherFiles)('%s stamps every field audit_events requires', file => {
    const source = readFileSync(join(SERVICES_DIR, file), 'utf8');
    const missing = REQUIRED_FIELDS.filter(field => !source.includes(field));
    expect(missing).toEqual([]);
  });

  it.each(publisherFiles)('%s does not derive aggregateId from a numeric or joined id', file => {
    const source = readFileSync(join(SERVICES_DIR, file), 'utf8');
    expect(source).not.toMatch(/aggregateId:\s*(String\(|[^,\n]*\.join\()/);
  });
});
