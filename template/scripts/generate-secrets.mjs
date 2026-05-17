#!/usr/bin/env node
import { randomBytes } from 'node:crypto';

const b64 = (n = 32) => randomBytes(n).toString('base64');

console.log('# Copy these into your .env file:');
console.log(`JWT_SECRET=${b64()}`);
console.log(`JWT_REFRESH_SECRET=${b64()}`);
console.log(`SESSION_SECRET=${b64()}`);
console.log(`CSRF_SECRET=${b64()}`);
console.log(`ENCRYPTION_KEY=${randomBytes(32).toString('hex')}`);
