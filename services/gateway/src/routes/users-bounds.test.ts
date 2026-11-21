import { afterAll, beforeAll, describe } from 'vitest';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { NotificationsClient } from '../grpc-clients/notifications-client.js';
import {
  createBoundsHarness,
  describeBounds,
  makeAnyClient,
  type BoundsCase,
  type BoundsHarness,
} from '../../test/helpers/bounds-cases.js';

import { registerUsersRoutes } from './users.js';

const adminUserFields = [
  ['status', 'token'],
  ['userType', 'token'],
  ['user_type', 'token'],
  ['firstName', 'name'],
  ['lastName', 'name'],
] as const;

const cases: readonly BoundsCase[] = [
  {
    method: 'PUT',
    url: '/api/v1/users/profile',
    valid: { firstName: 'Sam' },
    fields: [
      ['firstName', 'name'],
      ['first_name', 'name'],
      ['lastName', 'name'],
      ['last_name', 'name'],
      ['phoneNumber', 'phone'],
      ['phone_number', 'phone'],
      ['bio', 'longText'],
      ['timezone', 'token'],
      ['language', 'token'],
      ['country', 'token'],
      ['city', 'name'],
      ['addressLine1', 'name'],
      ['address_line_1', 'name'],
      ['addressLine2', 'name'],
      ['address_line_2', 'name'],
      ['postalCode', 'token'],
      ['postal_code', 'token'],
    ],
  },
  {
    method: 'PUT',
    url: '/api/v1/users/preferences',
    valid: { emailNotifications: true },
    fields: [['privacySettings.profileVisibility', 'token']],
  },
  {
    method: 'PUT',
    url: '/api/v1/users/usr-1',
    valid: { status: 'active' },
    fields: adminUserFields,
  },
  {
    method: 'POST',
    url: '/api/v1/users/usr-1/deactivate',
    valid: {},
    fields: [['reason', 'longText']],
  },
  {
    method: 'POST',
    url: '/api/v1/admin/users',
    valid: { email: 'new@example.com', firstName: 'Sam', lastName: 'Lee', role: 'adopter' },
    fields: [
      ['email', 'email'],
      ['firstName', 'name'],
      ['first_name', 'name'],
      ['lastName', 'name'],
      ['last_name', 'name'],
      ['role', 'token'],
      ['userType', 'token'],
      ['user_type', 'token'],
    ],
  },
  {
    method: 'PATCH',
    url: '/api/v1/admin/users/usr-1',
    valid: { status: 'active' },
    fields: adminUserFields,
  },
  {
    method: 'POST',
    url: '/api/v1/users/bulk-update',
    valid: { userIds: ['usr-1'], status: 'active' },
    fields: [
      ['userIds.0', 'token'],
      ['status', 'token'],
      ['updateData.status', 'token'],
      ['userType', 'token'],
      ['user_type', 'token'],
      ['reason', 'longText'],
    ],
  },
  {
    method: 'POST',
    url: '/api/v1/users/bulk-update',
    valid: { user_ids: ['usr-1'], status: 'active' },
    fields: [['user_ids.0', 'token']],
  },
  {
    method: 'PUT',
    url: '/api/v1/users/usr-1/role',
    valid: { role: 'adopter' },
    fields: [
      ['role', 'token'],
      ['userType', 'token'],
      ['user_type', 'token'],
    ],
  },
];

describe('users mutation body bounds (ENG-1406)', () => {
  let harness: BoundsHarness;

  beforeAll(async () => {
    harness = await createBoundsHarness(app =>
      registerUsersRoutes(app, {
        authClient: makeAnyClient<AuthClient>(),
        notificationsClient: makeAnyClient<NotificationsClient>(),
      })
    );
  });

  afterAll(async () => {
    await harness.app.close();
  });

  describeBounds(() => harness, cases);
});
