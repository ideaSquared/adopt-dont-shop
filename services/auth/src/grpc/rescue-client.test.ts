import { status, type Metadata } from '@grpc/grpc-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRescueClient } from './rescue-client';

type StubCallback = (err: unknown, res?: unknown) => void;

const stub = vi.hoisted(() => ({
  listStaffMembers: vi.fn(),
  close: vi.fn(),
}));

vi.mock('@adopt-dont-shop/proto', () => ({
  RescueV1: {
    RescueServiceClient: vi.fn(function RescueServiceClient() {
      return stub;
    }),
  },
}));

const metadata = {} as Metadata;
const grpcError = (code: number) => Object.assign(new Error(`grpc ${code}`), { code });

describe('createRescueClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stub.listStaffMembers.mockReset();
    stub.close.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with the staff list from rescue', async () => {
    const response = { staffMembers: [{ userId: 'u1' }] };
    stub.listStaffMembers.mockImplementation((_req, _md, _opts, cb: StubCallback) =>
      cb(null, response)
    );

    const client = createRescueClient({ address: 'rescue:6004' });

    await expect(client.listStaffMembers({}, metadata)).resolves.toBe(response);
    expect(stub.listStaffMembers).toHaveBeenCalledTimes(1);
  });

  it('sets a deadline on every call', async () => {
    stub.listStaffMembers.mockImplementation((_req, _md, _opts, cb: StubCallback) => cb(null, {}));

    await createRescueClient({ address: 'rescue:6004', deadlineMs: 1_000 }).listStaffMembers(
      {},
      metadata
    );

    const options = stub.listStaffMembers.mock.calls[0][2] as { deadline: Date };
    expect(options.deadline.getTime()).toBe(Date.now() + 1_000);
  });

  it('retries an UNAVAILABLE call and returns the later success', async () => {
    const response = { staffMembers: [] };
    stub.listStaffMembers
      .mockImplementationOnce((_req, _md, _opts, cb: StubCallback) =>
        cb(grpcError(status.UNAVAILABLE))
      )
      .mockImplementationOnce((_req, _md, _opts, cb: StubCallback) => cb(null, response));

    const result = createRescueClient({ address: 'rescue:6004' }).listStaffMembers({}, metadata);
    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe(response);
    expect(stub.listStaffMembers).toHaveBeenCalledTimes(2);
  });

  it('gives up after maxRetries and rejects with the last error', async () => {
    stub.listStaffMembers.mockImplementation((_req, _md, _opts, cb: StubCallback) =>
      cb(grpcError(status.DEADLINE_EXCEEDED))
    );

    const result = createRescueClient({ address: 'rescue:6004', maxRetries: 1 }).listStaffMembers(
      {},
      metadata
    );
    const assertion = expect(result).rejects.toMatchObject({ code: status.DEADLINE_EXCEEDED });
    await vi.runAllTimersAsync();

    await assertion;
    expect(stub.listStaffMembers).toHaveBeenCalledTimes(2);
  });

  it.each([status.NOT_FOUND, status.PERMISSION_DENIED])(
    'does not retry non-transient status %i',
    async code => {
      stub.listStaffMembers.mockImplementation((_req, _md, _opts, cb: StubCallback) =>
        cb(grpcError(code))
      );

      await expect(
        createRescueClient({ address: 'rescue:6004' }).listStaffMembers({}, metadata)
      ).rejects.toMatchObject({ code });
      expect(stub.listStaffMembers).toHaveBeenCalledTimes(1);
    }
  );

  it('does not retry an error without a gRPC status code', async () => {
    stub.listStaffMembers.mockImplementation((_req, _md, _opts, cb: StubCallback) =>
      cb(new Error('boom'))
    );

    await expect(
      createRescueClient({ address: 'rescue:6004' }).listStaffMembers({}, metadata)
    ).rejects.toThrow('boom');
    expect(stub.listStaffMembers).toHaveBeenCalledTimes(1);
  });

  it('closes the underlying channel', () => {
    createRescueClient({ address: 'rescue:6004' }).close();

    expect(stub.close).toHaveBeenCalledTimes(1);
  });
});
