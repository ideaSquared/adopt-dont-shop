import { Metadata, status } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationsV1, type CreateEmailTemplateRequest } from '@adopt-dont-shop/proto';

import type { NotificationsClient } from '../grpc-clients/notifications-client.js';

import { registerEmailRoutes } from './email.js';

const TEMPLATE_FIXTURE: NotificationsV1.EmailTemplate = {
  templateId: 'tpl-1',
  name: 'welcome',
  type: NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_TRANSACTIONAL,
  category: 'welcome',
  status: NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_ACTIVE,
  subject: 'Welcome {{name}}',
  htmlContent: '<p>Hi {{name}}</p>',
  variablesJson: '["name"]',
  locale: 'en',
  usageCount: 0,
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
} as unknown as NotificationsV1.EmailTemplate;

function makeClient(): NotificationsClient & {
  listEmailTemplatesMock: ReturnType<typeof vi.fn>;
  getEmailTemplateMock: ReturnType<typeof vi.fn>;
  createEmailTemplateMock: ReturnType<typeof vi.fn>;
  updateEmailTemplateMock: ReturnType<typeof vi.fn>;
  deleteEmailTemplateMock: ReturnType<typeof vi.fn>;
  previewEmailTemplateMock: ReturnType<typeof vi.fn>;
} {
  const listEmailTemplatesMock = vi.fn();
  const getEmailTemplateMock = vi.fn();
  const createEmailTemplateMock = vi.fn();
  const updateEmailTemplateMock = vi.fn();
  const deleteEmailTemplateMock = vi.fn();
  const previewEmailTemplateMock = vi.fn();
  return {
    listEmailTemplates: listEmailTemplatesMock,
    getEmailTemplate: getEmailTemplateMock,
    createEmailTemplate: createEmailTemplateMock,
    updateEmailTemplate: updateEmailTemplateMock,
    deleteEmailTemplate: deleteEmailTemplateMock,
    previewEmailTemplate: previewEmailTemplateMock,
    create: vi.fn(),
    list: vi.fn(),
    dismiss: vi.fn(),
    getNotification: vi.fn(),
    getUnreadCount: vi.fn(),
    markAllRead: vi.fn(),
    deleteNotification: vi.fn(),
    getNotificationPreferences: vi.fn(),
    updateNotificationPreferences: vi.fn(),
    resetNotificationPreferences: vi.fn(),
    cleanupExpiredNotifications: vi.fn(),
    registerDeviceToken: vi.fn(),
    unregisterDeviceToken: vi.fn(),
    listDeviceTokens: vi.fn(),
    close: vi.fn(),
    listEmailTemplatesMock,
    getEmailTemplateMock,
    createEmailTemplateMock,
    updateEmailTemplateMock,
    deleteEmailTemplateMock,
    previewEmailTemplateMock,
  } as NotificationsClient & {
    listEmailTemplatesMock: ReturnType<typeof vi.fn>;
    getEmailTemplateMock: ReturnType<typeof vi.fn>;
    createEmailTemplateMock: ReturnType<typeof vi.fn>;
    updateEmailTemplateMock: ReturnType<typeof vi.fn>;
    deleteEmailTemplateMock: ReturnType<typeof vi.fn>;
    previewEmailTemplateMock: ReturnType<typeof vi.fn>;
  };
}

async function buildApp(client: NotificationsClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerEmailRoutes(app, { client });
  return app;
}

describe('GET /api/v1/email/templates', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;
  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('forwards filters + returns the envelope', async () => {
    client.listEmailTemplatesMock.mockResolvedValueOnce({
      templates: [TEMPLATE_FIXTURE],
      total: 1,
      page: 1,
      totalPages: 1,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/email/templates?type=transactional&status=active&search=wel',
      headers: { 'x-user-id': 'svc-admin', 'x-user-roles': 'admin' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: unknown[]; pagination: { total: number } };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.pagination.total).toBe(1);
    const [grpcReq] = client.listEmailTemplatesMock.mock.calls[0] as [
      { typeFilter: NotificationsV1.EmailTemplateType },
      Metadata,
    ];
    expect(grpcReq.typeFilter).toBe(
      NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_TRANSACTIONAL
    );
  });

  it('maps PERMISSION_DENIED → 403', async () => {
    client.listEmailTemplatesMock.mockRejectedValueOnce({
      code: status.PERMISSION_DENIED,
      details: 'no',
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/email/templates',
      headers: { 'x-user-id': 'usr-1' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('POST /api/v1/email/templates', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;
  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 201 and maps body fields incl. variables array → JSON', async () => {
    client.createEmailTemplateMock.mockResolvedValueOnce({ template: TEMPLATE_FIXTURE });
    await app.inject({
      method: 'POST',
      url: '/api/v1/email/templates',
      headers: {
        'x-user-id': 'svc-admin',
        'x-user-roles': 'admin',
        'content-type': 'application/json',
      },
      payload: {
        name: 'welcome',
        type: 'transactional',
        category: 'welcome',
        status: 'draft',
        subject: 'Hi {{name}}',
        html_content: '<p>{{name}}</p>',
        variables: ['name'],
      },
    });
    const [grpcReq] = client.createEmailTemplateMock.mock.calls[0] as [
      CreateEmailTemplateRequest,
      Metadata,
    ];
    expect(grpcReq.name).toBe('welcome');
    expect(grpcReq.htmlContent).toBe('<p>{{name}}</p>');
    expect(grpcReq.variablesJson).toBe('["name"]');
    expect(grpcReq.type).toBe(NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_TRANSACTIONAL);
  });

  it('maps INVALID_ARGUMENT → 400', async () => {
    client.createEmailTemplateMock.mockRejectedValueOnce({
      code: status.INVALID_ARGUMENT,
      details: 'name required',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/email/templates',
      headers: { 'x-user-id': 'svc-admin', 'content-type': 'application/json' },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET/PUT/DELETE /api/v1/email/templates/:id', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;
  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('GET returns the template', async () => {
    client.getEmailTemplateMock.mockResolvedValueOnce({ template: TEMPLATE_FIXTURE });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/email/templates/tpl-1',
      headers: { 'x-user-id': 'svc-admin', 'x-user-roles': 'admin' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: { templateId: string } };
    expect(body.data.templateId).toBe('tpl-1');
  });

  it('GET maps NOT_FOUND → 404', async () => {
    client.getEmailTemplateMock.mockRejectedValueOnce({ code: status.NOT_FOUND, details: 'gone' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/email/templates/ghost',
      headers: { 'x-user-id': 'svc-admin' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('PUT forwards the id + set fields', async () => {
    client.updateEmailTemplateMock.mockResolvedValueOnce({ template: TEMPLATE_FIXTURE });
    await app.inject({
      method: 'PUT',
      url: '/api/v1/email/templates/tpl-1',
      headers: {
        'x-user-id': 'svc-admin',
        'x-user-roles': 'admin',
        'content-type': 'application/json',
      },
      payload: { subject: 'Updated' },
    });
    const [grpcReq] = client.updateEmailTemplateMock.mock.calls[0] as [
      { templateId: string; subject?: string },
      Metadata,
    ];
    expect(grpcReq.templateId).toBe('tpl-1');
    expect(grpcReq.subject).toBe('Updated');
  });

  it('DELETE returns success', async () => {
    client.deleteEmailTemplateMock.mockResolvedValueOnce({ deleted: true });
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/email/templates/tpl-1',
      headers: { 'x-user-id': 'svc-admin', 'x-user-roles': 'admin' },
    });
    expect(res.statusCode).toBe(200);
    expect(client.deleteEmailTemplateMock).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/v1/email/templates/:id/preview', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;
  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('forwards variables + returns the rendered output', async () => {
    client.previewEmailTemplateMock.mockResolvedValueOnce({
      subject: 'Welcome Jane',
      htmlContent: '<p>Hi Jane</p>',
      textContent: 'Hi Jane',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/email/templates/tpl-1/preview',
      headers: {
        'x-user-id': 'svc-admin',
        'x-user-roles': 'admin',
        'content-type': 'application/json',
      },
      payload: { variables: { name: 'Jane' } },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: { subject: string; htmlContent: string } };
    expect(body.data.subject).toBe('Welcome Jane');
    const [grpcReq] = client.previewEmailTemplateMock.mock.calls[0] as [
      { variablesJson: string },
      Metadata,
    ];
    expect(grpcReq.variablesJson).toBe('{"name":"Jane"}');
  });
});
