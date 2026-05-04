import { URLS } from '../playwright.config';

export type RoleKey = 'adopter' | 'rescue' | 'admin';

export type Role = {
  key: RoleKey;
  email: string;
  password: string;
  appUrl: string;
};

const SEEDED_PASSWORD = process.env.E2E_SEED_PASSWORD ?? 'DevPassword123!';

export const ROLES: Record<RoleKey, Role> = {
  adopter: {
    key: 'adopter',
    email: process.env.E2E_ADOPTER_EMAIL ?? 'john.smith@gmail.com',
    password: SEEDED_PASSWORD,
    appUrl: URLS.client,
  },
  rescue: {
    key: 'rescue',
    email: process.env.E2E_RESCUE_EMAIL ?? 'rescue.manager@pawsrescue.dev',
    password: SEEDED_PASSWORD,
    appUrl: URLS.rescue,
  },
  admin: {
    key: 'admin',
    email: process.env.E2E_ADMIN_EMAIL ?? 'superadmin@adoptdontshop.dev',
    password: SEEDED_PASSWORD,
    appUrl: URLS.admin,
  },
};

export const SECONDARY_USERS = {
  adopter2: 'emily.davis@yahoo.com',
  adopter3: 'michael.brown@outlook.com',
  rescueStaff2: 'sarah.johnson@pawsrescue.dev',
  rescueAdmin2: 'maria@happytailsrescue.dev',
  adminMod: 'moderator@adoptdontshop.dev',
} as const;
