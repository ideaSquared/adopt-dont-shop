import { describe, expect, it } from 'vitest';

import { RescueV1, type ListRescuesResponse, type Rescue } from '@adopt-dont-shop/proto';

import { rescueDataEnvelope, rescueListEnvelope, rescueToView } from './rescue-view.js';

function makeRescue(overrides: Partial<Rescue> = {}): Rescue {
  return {
    rescueId: 'rsc-1',
    name: 'Happy Tails',
    email: 'hi@happy.example',
    address: '1 Lane',
    city: 'York',
    postcode: 'YO1 1AA',
    country: 'GB',
    contactPerson: 'Jo',
    status: RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED,
    settingsJson: '{"emailDigest":true}',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-02T00:00:00.000Z',
    ...overrides,
  } as Rescue;
}

describe('rescueToView', () => {
  it('emits snake_case keys + lowercase status + unpacked settings', () => {
    expect(rescueToView(makeRescue())).toMatchObject({
      rescue_id: 'rsc-1',
      name: 'Happy Tails',
      contact_person: 'Jo',
      status: 'verified',
      settings: { emailDigest: true },
    });
  });

  it('emits null for optional fields when absent', () => {
    const v = rescueToView(makeRescue());
    expect(v.phone).toBeNull();
    expect(v.verified_at).toBeNull();
    expect(v.verification_source).toBeNull();
  });

  it('handles malformed settings_json safely', () => {
    expect(rescueToView(makeRescue({ settingsJson: 'not-json' })).settings).toEqual({});
    expect(rescueToView(makeRescue({ settingsJson: '[1,2]' })).settings).toEqual({});
  });

  it('maps non-default status enums (pending / rejected / suspended)', () => {
    expect(
      rescueToView(makeRescue({ status: RescueV1.RescueStatus.RESCUE_STATUS_PENDING })).status
    ).toBe('pending');
    expect(
      rescueToView(makeRescue({ status: RescueV1.RescueStatus.RESCUE_STATUS_SUSPENDED })).status
    ).toBe('suspended');
  });
});

describe('rescueListEnvelope', () => {
  it('wraps results in { success, data, meta } and reports hasNext from cursor', () => {
    const env = rescueListEnvelope({
      rescues: [makeRescue(), makeRescue({ rescueId: 'rsc-2' })],
      nextCursor: 'abc',
    } as ListRescuesResponse);
    expect(env.success).toBe(true);
    expect(env.data).toHaveLength(2);
    expect(env.meta.hasNext).toBe(true);
    expect(env.meta.nextCursor).toBe('abc');
  });

  it('omits nextCursor when there is no next page', () => {
    const env = rescueListEnvelope({ rescues: [makeRescue()] } as ListRescuesResponse);
    expect(env.meta.hasNext).toBe(false);
    expect('nextCursor' in env.meta).toBe(false);
  });
});

describe('rescueDataEnvelope', () => {
  it('wraps a single rescue in { success, data }', () => {
    const env = rescueDataEnvelope(makeRescue());
    expect(env.success).toBe(true);
    expect(env.data.rescue_id).toBe('rsc-1');
  });
});
