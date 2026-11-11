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
const PUBLISH_SITE = /type:\s*'[a-z]+\.actionTaken'/g;
const REQUIRED_FIELDS = ['eventId:', 'outcome:', 'occurredAt:', 'aggregateId:'] as const;
const NON_UUID_AGGREGATE = /aggregateId:\s*(String\(|[^,\n]*\.join\()/;

// The object literal that contains `index`: walks out to the nearest unbalanced braces.
const enclosingObject = (source: string, index: number): string => {
  const start = [...source.slice(0, index)].reduceRight(
    (acc, char, i) => {
      if (acc.found !== undefined) {
        return acc;
      }
      if (char === '}') {
        return { ...acc, depth: acc.depth + 1 };
      }
      if (char !== '{') {
        return acc;
      }
      return acc.depth === 0 ? { ...acc, found: i } : { ...acc, depth: acc.depth - 1 };
    },
    { depth: 0, found: undefined as number | undefined }
  ).found;
  if (start === undefined) {
    return source;
  }
  const end = [...source.slice(index)].reduce(
    (acc, char, i) => {
      if (acc.found !== undefined) {
        return acc;
      }
      if (char === '{') {
        return { ...acc, depth: acc.depth + 1 };
      }
      if (char !== '}') {
        return acc;
      }
      return acc.depth === 0 ? { ...acc, found: index + i } : { ...acc, depth: acc.depth - 1 };
    },
    { depth: 0, found: undefined as number | undefined }
  ).found;
  return source.slice(start, (end ?? source.length - 1) + 1);
};

// One entry per `type: '<x>.actionTaken'` site, each checked against its OWN object so a
// complete publisher cannot mask an incomplete one in the same file.
export const publishSites = (source: string): ReadonlyArray<{ line: number; object: string }> =>
  [...source.matchAll(PUBLISH_SITE)].map(match => ({
    line: source.slice(0, match.index).split('\n').length,
    object: enclosingObject(source, match.index),
  }));

export const siteProblems = (object: string): string[] => [
  ...REQUIRED_FIELDS.filter(field => !object.includes(field)).map(field => `missing ${field}`),
  ...(NON_UUID_AGGREGATE.test(object) ? ['aggregateId built from String() or join()'] : []),
];

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === 'node_modules' || name === 'generated' ? [] : sourceFiles(path);
    }
    const isSource = name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.d.ts');
    return isSource ? [path] : [];
  });

const publishers = readdirSync(SERVICES_DIR)
  .filter(name =>
    statSync(join(SERVICES_DIR, name, 'src'), { throwIfNoEntry: false })?.isDirectory()
  )
  .flatMap(name => sourceFiles(join(SERVICES_DIR, name, 'src')))
  .flatMap(file =>
    publishSites(readFileSync(file, 'utf8')).map(site => ({
      label: `${relative(SERVICES_DIR, file)}:${site.line}`,
      object: site.object,
    }))
  );

describe('actionTaken publishers', () => {
  it('finds the publishers (guards against the scan silently matching nothing)', () => {
    expect(publishers.length).toBeGreaterThanOrEqual(15);
  });

  it.each(publishers.map(p => [p.label, p.object] as const))(
    '%s stamps every field audit_events requires with a uuid-safe aggregateId',
    (_label, object) => {
      expect(siteProblems(object)).toEqual([]);
    }
  );

  it('checks each publisher independently: an incomplete one is flagged even beside a complete one', () => {
    const source = `
      publish({ type: 'x.actionTaken', id: 'a', payload: { eventId: randomUUID(), outcome: 'success', occurredAt: now, aggregateId: id } });
      publish({ type: 'x.actionTaken', id: 'b', payload: { outcome: 'success', occurredAt: now, aggregateId: id } });
    `;
    const [complete, incomplete] = publishSites(source);
    expect(siteProblems(complete.object)).toEqual([]);
    expect(siteProblems(incomplete.object)).toEqual(['missing eventId:']);
  });

  it('flags an aggregateId built from a numeric or joined id', () => {
    const object = `{ type: 'x.actionTaken', payload: { eventId: e, outcome: o, occurredAt: t, aggregateId: String(row.id) } }`;
    expect(siteProblems(object)).toEqual(['aggregateId built from String() or join()']);
  });
});
