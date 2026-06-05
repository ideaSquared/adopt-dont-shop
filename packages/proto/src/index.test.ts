import { describe, expect, it } from 'vitest';

import { PingV1, type EchoRequest, type EchoResponse } from './index.js';

describe('@adopt-dont-shop/proto', () => {
  describe('dual binding (CAD #7)', () => {
    it('exports the value namespace under PingV1 with the message factory', () => {
      expect(PingV1).toBeDefined();
      expect(PingV1.EchoRequest).toBeDefined();
      expect(typeof PingV1.EchoRequest.encode).toBe('function');
      expect(typeof PingV1.EchoRequest.decode).toBe('function');
    });

    it('exports the flat interface for use in type positions', () => {
      // If this compiles, the type-only re-export is reachable. The
      // runtime check just touches the variable so the import isn't
      // tree-shaken into oblivion by the test transformer.
      const req: EchoRequest = { message: 'hi' };
      const res: EchoResponse = { message: 'hi', receivedAt: '2026-01-01T00:00:00Z' };
      expect(req.message).toBe('hi');
      expect(res.receivedAt).toBe('2026-01-01T00:00:00Z');
    });
  });

  describe('wire format round-trip', () => {
    it('encodes then decodes a message via the binary wire format', () => {
      const original: EchoRequest = { message: 'hello world' };
      const buf = PingV1.EchoRequest.encode(original).finish();
      const decoded = PingV1.EchoRequest.decode(buf);
      expect(decoded.message).toBe('hello world');
    });

    it('round-trips an EchoResponse including the receivedAt timestamp', () => {
      const original: EchoResponse = {
        message: 'pong',
        receivedAt: '2026-06-04T22:30:00Z',
      };
      const buf = PingV1.EchoResponse.encode(original).finish();
      const decoded = PingV1.EchoResponse.decode(buf);
      expect(decoded).toEqual(original);
    });
  });

  describe('JSON helpers (gateway REST translation surface)', () => {
    it('produces a plain JS object via toJSON', () => {
      const original: EchoRequest = { message: 'json' };
      const json = PingV1.EchoRequest.toJSON(original);
      expect(json).toEqual({ message: 'json' });
    });

    it('parses a JS object back into the message shape via fromJSON', () => {
      const restored = PingV1.EchoRequest.fromJSON({ message: 'json' });
      expect(restored).toEqual({ message: 'json' });
    });
  });
});
