// Constant-time equality for shared secrets compared against attacker-supplied
// input (ADS-1377). `===` short-circuits on the first differing byte, which is
// a timing side channel. Byte lengths are compared first because
// crypto.timingSafeEqual throws on a length mismatch; comparing byte (not
// character) length keeps multibyte input from slipping past that guard.

import { timingSafeEqual } from 'node:crypto';

export const constantTimeEquals = (a: string, b: string): boolean => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
};
