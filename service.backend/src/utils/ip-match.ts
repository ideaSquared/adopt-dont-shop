/**
 * Tiny CIDR match for IPv4. We only need to know "is this IP inside
 * this rule" — we don't need a full netaddr lib. IPv6 falls back to
 * exact-string equality (sufficient for the admin allow/block list
 * use case; if v6 ranges are ever required, swap in `ipaddr.js`).
 */

export function isValidCidrOrIp(value: string): boolean {
  if (!value || value.length > 64) {
    return false;
  }
  const [addr, prefixStr] = value.split('/');
  if (!addr) {
    return false;
  }

  if (addr.includes(':')) {
    if (prefixStr !== undefined) {
      const prefix = Number(prefixStr);
      if (!Number.isInteger(prefix) || prefix < 0 || prefix > 128) {
        return false;
      }
    }
    return /^[0-9a-fA-F:]+$/.test(addr);
  }

  const octets = addr.split('.');
  if (octets.length !== 4) {
    return false;
  }
  for (const o of octets) {
    const n = Number(o);
    if (!Number.isInteger(n) || n < 0 || n > 255 || o !== String(n)) {
      return false;
    }
  }
  if (prefixStr !== undefined) {
    const prefix = Number(prefixStr);
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
      return false;
    }
  }
  return true;
}

function ipv4ToInt(ip: string): number | null {
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some(o => !Number.isInteger(o) || o < 0 || o > 255)) {
    return null;
  }
  // Use unsigned right shift to keep the result non-negative.
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

/**
 * Returns true if `ip` is contained by `cidr`. Works for IPv4 ranges
 * (`/N`) and exact IPv4 / IPv6 matches. Mixing families never matches.
 */
export function ipMatches(ip: string, cidr: string): boolean {
  if (!ip || !cidr) {
    return false;
  }

  const isIpV6 = ip.includes(':');
  const isCidrV6 = cidr.includes(':');
  if (isIpV6 !== isCidrV6) {
    return false;
  }

  if (isIpV6) {
    // No range support for v6 yet — exact string match (after stripping prefix).
    const [addr] = cidr.split('/');
    return addr === ip;
  }

  const [addr, prefixStr] = cidr.split('/');
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(addr);
  if (ipInt === null || baseInt === null) {
    return false;
  }

  if (prefixStr === undefined) {
    return ipInt === baseInt;
  }

  const prefix = Number(prefixStr);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }
  if (prefix === 0) {
    return true;
  }
  // Mask must be unsigned; left-shift by 32 is undefined in JS so guard prefix===0.
  const mask = (~0 << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}
