import { describe, it, expect } from 'vitest';
import { ipMatches, isValidCidrOrIp } from '../../utils/ip-match';

describe('ip-match', () => {
  describe('isValidCidrOrIp', () => {
    it('accepts an IPv4 single address', () => {
      expect(isValidCidrOrIp('192.168.1.1')).toBe(true);
    });

    it('accepts an IPv4 CIDR range', () => {
      expect(isValidCidrOrIp('10.0.0.0/8')).toBe(true);
      expect(isValidCidrOrIp('172.16.0.0/12')).toBe(true);
      expect(isValidCidrOrIp('0.0.0.0/0')).toBe(true);
    });

    it('rejects an IPv4 address with an octet over 255', () => {
      expect(isValidCidrOrIp('256.0.0.0')).toBe(false);
    });

    it('rejects an IPv4 address with too few octets', () => {
      expect(isValidCidrOrIp('1.2.3')).toBe(false);
    });

    it('rejects an out-of-range prefix', () => {
      expect(isValidCidrOrIp('10.0.0.0/33')).toBe(false);
    });

    it('rejects empty / oversized input', () => {
      expect(isValidCidrOrIp('')).toBe(false);
      expect(isValidCidrOrIp('a'.repeat(100))).toBe(false);
    });

    it('accepts a basic IPv6 address', () => {
      expect(isValidCidrOrIp('::1')).toBe(true);
      expect(isValidCidrOrIp('fe80::1')).toBe(true);
    });
  });

  describe('ipMatches', () => {
    it('matches an IPv4 inside its CIDR', () => {
      expect(ipMatches('10.5.4.3', '10.0.0.0/8')).toBe(true);
      expect(ipMatches('192.168.1.42', '192.168.1.0/24')).toBe(true);
    });

    it('does not match an IPv4 outside its CIDR', () => {
      expect(ipMatches('11.0.0.1', '10.0.0.0/8')).toBe(false);
      expect(ipMatches('192.168.2.1', '192.168.1.0/24')).toBe(false);
    });

    it('matches a single-address rule exactly', () => {
      expect(ipMatches('1.2.3.4', '1.2.3.4')).toBe(true);
      expect(ipMatches('1.2.3.5', '1.2.3.4')).toBe(false);
    });

    it('treats /0 as match-everything for IPv4', () => {
      expect(ipMatches('1.2.3.4', '0.0.0.0/0')).toBe(true);
    });

    it('does not cross-match IPv4 against IPv6 rules', () => {
      expect(ipMatches('10.0.0.1', '::1')).toBe(false);
      expect(ipMatches('::1', '10.0.0.0/8')).toBe(false);
    });

    it('returns false for malformed inputs rather than throwing', () => {
      expect(ipMatches('', '10.0.0.0/8')).toBe(false);
      expect(ipMatches('10.0.0.1', '')).toBe(false);
      expect(ipMatches('not-an-ip', '10.0.0.0/8')).toBe(false);
    });
  });
});
