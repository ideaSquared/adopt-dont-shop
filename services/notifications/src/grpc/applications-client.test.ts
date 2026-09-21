// Behaviour tests for the notifications applications-client (ADS-1270).
// Mirrors pets-client.test.ts: a real @grpc/grpc-js Server bound to
// 127.0.0.1:0, torn down in afterEach.

import { Metadata, Server, ServerCredentials, ServerUnaryCall, sendUnaryData } from '@grpc/grpc-js';

import {
  ApplicationsV1,
  type ListApplicationsRequest,
  type ListApplicationsResponse,
} from '@adopt-dont-shop/proto';
import {
  PRINCIPAL_TOKEN_HEADER,
  resetDefaultPrincipalSigningKeyForTests,
  verifyPrincipalToken,
} from '@adopt-dont-shop/service-bootstrap';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApplicationsClient } from './applications-client.js';

const minimalApplication = {
  applicationId: 'app-1',
  adopterId: 'usr-1',
  petId: 'pet-1',
  rescueId: 'rsc-1',
  status: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_SUBMITTED,
  answersJson: '',
  referencesJson: '',
  version: 1,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

describe('createApplicationsClient — listByUser (ADS-1270)', () => {
  let server: Server;
  let port: number;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    delete process.env.PRINCIPAL_SIGNING_KEY;
    resetDefaultPrincipalSigningKeyForTests();
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  it('passes adopter_id_filter through and resolves with the returned applications', async () => {
    let received: ListApplicationsRequest | undefined;
    server.addService(ApplicationsV1.ApplicationServiceService, {
      list: (
        call: ServerUnaryCall<ListApplicationsRequest, ListApplicationsResponse>,
        cb: sendUnaryData<ListApplicationsResponse>
      ) => {
        received = call.request;
        cb(null, { applications: [minimalApplication] });
      },
    });
    port = await new Promise<number>((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) =>
        err ? reject(err) : resolve(boundPort)
      );
    });

    const client = createApplicationsClient({ address: `127.0.0.1:${port}` });
    try {
      const applications = await client.listByUser('usr-1');
      expect(received?.adopterIdFilter).toBe('usr-1');
      expect(applications).toHaveLength(1);
      expect(applications[0].applicationId).toBe('app-1');
    } finally {
      client.close();
    }
  });

  it('stamps a verifiable x-principal-token carrying the super_admin role (ADS-800)', async () => {
    const SIGNING_KEY = 'notifications-applications-test-signing-key';
    process.env.PRINCIPAL_SIGNING_KEY = SIGNING_KEY;
    resetDefaultPrincipalSigningKeyForTests();

    const captured: Metadata[] = [];
    server.addService(ApplicationsV1.ApplicationServiceService, {
      list: (
        call: ServerUnaryCall<ListApplicationsRequest, ListApplicationsResponse>,
        cb: sendUnaryData<ListApplicationsResponse>
      ) => {
        captured.push(call.metadata);
        cb(null, { applications: [] });
      },
    });
    port = await new Promise<number>((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) =>
        err ? reject(err) : resolve(boundPort)
      );
    });

    const client = createApplicationsClient({ address: `127.0.0.1:${port}` });
    try {
      await client.listByUser('usr-1');
      expect(captured).toHaveLength(1);
      const token = String(captured[0].get(PRINCIPAL_TOKEN_HEADER)[0]);
      const principal = verifyPrincipalToken(token, SIGNING_KEY);
      expect(principal.userId).toBe('svc-notifications');
      expect(principal.roles).toEqual(['super_admin']);
    } finally {
      client.close();
    }
  });
});
