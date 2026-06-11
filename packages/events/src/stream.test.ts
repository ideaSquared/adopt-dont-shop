// Behaviour: the DOMAIN_EVENTS stream must capture every domain subject the
// services publish, without overlapping NATS's internal namespaces. A stream
// whose subjects overlap `$JS.API.>` is rejected by the server at creation
// time (err 10052: "subjects that overlap with jetstream api require no-ack
// to be true"), which crashes every service at boot — so the subject list
// must be explicit prefixes, never a bare token wildcard like `*.>`.

import { describe, expect, it, vi } from 'vitest';
import type { NatsConnection } from 'nats';

import { DOMAIN_STREAM, DOMAIN_SUBJECTS, ensureStream } from './stream.js';

// Token-aware matcher mirroring NATS semantics: `*` matches exactly one
// token (including `$JS`), `>` matches one or more trailing tokens.
function subjectMatches(filter: string, subject: string): boolean {
  const f = filter.split('.');
  const s = subject.split('.');
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '>') {
      return s.length > i;
    }
    if (s.length <= i) {
      return false;
    }
    if (f[i] !== '*' && f[i] !== s[i]) {
      return false;
    }
  }
  return f.length === s.length;
}

const DOMAIN_PREFIXES = [
  'auth',
  'pets',
  'rescue',
  'applications',
  'chat',
  'notifications',
  'moderation',
  'matching',
  'cms',
  'audit',
  'gdpr',
];

describe('DOMAIN_SUBJECTS', () => {
  it('does not overlap the JetStream API namespace (would crash every service at boot)', () => {
    const jsApiSubjects = [
      '$JS.API.STREAM.INFO.DOMAIN_EVENTS',
      '$JS.API.CONSUMER.CREATE.DOMAIN_EVENTS',
      '$JS.ACK.DOMAIN_EVENTS.d.1.1.1.1',
      '$SYS.REQ.SERVER.PING',
    ];
    for (const api of jsApiSubjects) {
      for (const filter of DOMAIN_SUBJECTS) {
        expect(
          subjectMatches(filter, api),
          `stream filter "${filter}" must not capture "${api}"`
        ).toBe(false);
      }
    }
  });

  it('captures every domain prefix the services publish on', () => {
    for (const prefix of DOMAIN_PREFIXES) {
      const sample = `${prefix}.something.happened`;
      const covered = DOMAIN_SUBJECTS.some(filter => subjectMatches(filter, sample));
      expect(covered, `subject "${sample}" must land in ${DOMAIN_STREAM}`).toBe(true);
    }
  });
});

describe('ensureStream', () => {
  function makeNc(addImpl: () => Promise<unknown>) {
    const add = vi.fn(addImpl);
    const update = vi.fn(async () => ({}));
    const nc = {
      jetstreamManager: vi.fn(async () => ({ streams: { add, update } })),
    } as unknown as NatsConnection;
    return { nc, add, update };
  }

  it('creates the stream with the domain subjects', async () => {
    const { nc, add, update } = makeNc(async () => ({}));

    await ensureStream(nc);

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ name: DOMAIN_STREAM, subjects: [...DOMAIN_SUBJECTS] })
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('reconciles via update when the stream already exists', async () => {
    const { nc, update } = makeNc(async () => {
      throw new Error('stream name already in use');
    });

    await ensureStream(nc);

    expect(update).toHaveBeenCalledWith(
      DOMAIN_STREAM,
      expect.objectContaining({ subjects: [...DOMAIN_SUBJECTS] })
    );
  });
});
