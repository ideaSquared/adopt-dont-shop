import { describe, expect, it } from 'vitest';

import { PROTO_SCHEMA } from '@adopt-dont-shop/proto';

import { buildCatalog } from './catalog.js';
import { createMethodResolver } from './proto-methods.js';
import { commandName, getRegistryEntry, REGISTRY, splitRpc } from './registry.js';

describe('registry', () => {
  const rpcs = Object.keys(REGISTRY);

  it.each(rpcs)('%s exists in the generated PROTO_SCHEMA and resolves to real codecs', rpc => {
    const { service, method } = splitRpc(rpc);
    const svc = Object.values(PROTO_SCHEMA.services).find(s => s.package.split('.')[1] === service);
    expect(svc?.methods.some(m => m.name === method)).toBe(true);
    const resolved = createMethodResolver(PROTO_SCHEMA)(rpc);
    expect(resolved?.grpcPath).toBe(`/${svc?.fullName}/${method}`);
  });

  it.each(rpcs)('%s declares permissions and write entries declare a dry-run mode', rpc => {
    const entry = REGISTRY[rpc];
    expect(entry.permissions.length).toBeGreaterThan(0);
    expect(entry.kind === 'write' ? entry.dryRun : 'read').toBeTruthy();
  });

  it('declares piiRequestFields that exist on the request message', () => {
    Object.entries(REGISTRY).forEach(([rpc, entry]) => {
      const resolved = createMethodResolver(PROTO_SCHEMA)(rpc);
      const fields = PROTO_SCHEMA.messages[resolved?.inputType ?? '']?.fields.map(f => f.jsonName);
      (entry.piiRequestFields ?? []).forEach(f => expect(fields).toContain(f));
    });
  });

  it('native dry-run writes have a dryRun field on the request', () => {
    Object.entries(REGISTRY).forEach(([rpc, entry]) => {
      if (entry.kind !== 'write' || entry.dryRun !== 'native') return;
      const input = createMethodResolver(PROTO_SCHEMA)(rpc)?.inputType ?? '';
      expect(PROTO_SCHEMA.messages[input].fields.some(f => f.jsonName === 'dryRun')).toBe(true);
    });
  });

  it('ignores prototype keys and kebab-cases commands', () => {
    expect(getRegistryEntry('constructor')).toBeUndefined();
    expect(commandName('UpdateStatus')).toBe('update-status');
    expect(commandName('AdminGetUser')).toBe('admin-get-user');
  });

  it('builds a catalog covering every registry method', () => {
    const catalog = buildCatalog('dev', PROTO_SCHEMA);
    const listed = catalog.services.flatMap(s => s.methods.map(m => m.rpc));
    expect(listed.sort()).toEqual([...rpcs].sort());
    expect(catalog.messages['adopt_dont_shop.auth.v1.User']).toBeDefined();
  });
});
