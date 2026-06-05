// Production PasswordHasher implementation backed by bcryptjs.
//
// Same library the monolith uses (service.backend/services/auth.service.ts
// imports `bcryptjs` directly). Keeping the package identical means the
// auth schema's existing `password` column values keep validating
// against this hasher without a re-hash on first login.
//
// Tests pass a vi.fn() stub — see handlers.test.ts. This file is only
// touched at boot when wiring real deps in src/index.ts.

import bcrypt from 'bcryptjs';

import type { PasswordHasher } from './handlers.js';

export function createBcryptPasswordHasher(): PasswordHasher {
  return {
    compare: (password, hash) => bcrypt.compare(password, hash),
  };
}
