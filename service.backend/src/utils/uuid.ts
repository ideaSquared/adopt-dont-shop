import { randomBytes } from 'crypto';

export const generateUuidV7 = (): string => {
  const now = BigInt(Date.now());
  const buf = Buffer.alloc(16);

  // Fill bytes 6-15 with random data first
  randomBytes(10).copy(buf, 6);

  // Overlay 48-bit unix timestamp (milliseconds) into bytes 0-5
  buf[0] = Number((now >> 40n) & 0xffn);
  buf[1] = Number((now >> 32n) & 0xffn);
  buf[2] = Number((now >> 24n) & 0xffn);
  buf[3] = Number((now >> 16n) & 0xffn);
  buf[4] = Number((now >> 8n) & 0xffn);
  buf[5] = Number(now & 0xffn);

  // Set version 7 in top nibble of byte 6
  buf[6] = (buf[6] & 0x0f) | 0x70;

  // Set RFC 4122 variant (0b10) in top 2 bits of byte 8
  buf[8] = (buf[8] & 0x3f) | 0x80;

  const hex = buf.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
