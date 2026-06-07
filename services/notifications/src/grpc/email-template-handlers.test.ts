import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import { NotificationsV1 } from '@adopt-dont-shop/proto';

import {
  createEmailTemplate,
  deleteEmailTemplate,
  getEmailTemplate,
  listEmailTemplates,
  previewEmailTemplate,
  updateEmailTemplate,
} from './email-template-handlers.js';

const ADMIN: Principal = {
  userId: 'svc-admin' as UserId,
  roles: ['admin'],
  permissions: [
    'email.templates.read' as Permission,
    'email.templates.create' as Permission,
    'email.templates.update' as Permission,
    'email.templates.delete' as Permission,
  ],
};

const NO_PERMS: Principal = {
  userId: 'usr-nobody' as UserId,
  roles: ['adopter'],
  permissions: [],
};

function makeMocks() {
  const pool = { query: vi.fn(), connect: vi.fn() };
  const nats = { publish: vi.fn() };
  return {
    deps: {
      pool: pool as unknown as Pool,
      nats: nats as unknown as NatsConnection,
    },
    poolMock: pool,
  };
}

const templateRow = (overrides: Record<string, unknown> = {}) => ({
  template_id: 'tpl-1',
  name: 'welcome',
  description: 'Welcome email',
  type: 'transactional',
  category: 'welcome',
  status: 'active',
  subject: 'Welcome {{name}}',
  html_content: '<p>Hi {{name}}</p>',
  text_content: 'Hi {{name}}',
  variables: ['name'],
  locale: 'en',
  usage_count: 3,
  last_used_at: null,
  created_at: new Date('2026-06-01T00:00:00Z'),
  updated_at: new Date('2026-06-01T00:00:00Z'),
  ...overrides,
});

// --- listEmailTemplates ----------------------------------------------

describe('listEmailTemplates', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects without email.templates.read', async () => {
    await expect(listEmailTemplates(mocks.deps, NO_PERMS, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns paginated templates with filters', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ total: '1' }] });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [templateRow()] });

    const res = await listEmailTemplates(mocks.deps, ADMIN, {
      typeFilter: NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_TRANSACTIONAL,
      statusFilter: NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_ACTIVE,
      categoryFilter: 'welcome',
      search: 'wel',
      page: 1,
      limit: 20,
    });

    expect(res.total).toBe(1);
    expect(res.templates).toHaveLength(1);
    expect(res.templates[0].name).toBe('welcome');
    const countCall = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(countCall[0]).toContain('type = $1');
    expect(countCall[0]).toContain('status = $2');
    expect(countCall[0]).toContain('category = $3');
    expect(countCall[0]).toContain('ILIKE');
  });
});

// --- getEmailTemplate ------------------------------------------------

describe('getEmailTemplate', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns NOT_FOUND for a missing template', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      getEmailTemplate(mocks.deps, ADMIN, { templateId: 'ghost' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns the template', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [templateRow()] });
    const res = await getEmailTemplate(mocks.deps, ADMIN, { templateId: 'tpl-1' });
    expect(res.template?.templateId).toBe('tpl-1');
    expect(res.template?.type).toBe(
      NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_TRANSACTIONAL
    );
    expect(res.template?.variablesJson).toBe('["name"]');
  });
});

// --- createEmailTemplate ---------------------------------------------

describe('createEmailTemplate', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects without create perm', async () => {
    await expect(
      createEmailTemplate(mocks.deps, NO_PERMS, {
        name: 'x',
        type: NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_TRANSACTIONAL,
        category: 'welcome',
        status: NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_DRAFT,
        subject: 's',
        htmlContent: '<p></p>',
        variablesJson: '[]',
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('rejects missing required fields', async () => {
    await expect(
      createEmailTemplate(mocks.deps, ADMIN, {
        name: '',
        type: NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_TRANSACTIONAL,
        category: 'welcome',
        status: NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_DRAFT,
        subject: 's',
        htmlContent: '<p></p>',
        variablesJson: '[]',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('inserts and returns the created row', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [templateRow({ name: 'new-tpl' })] });
    const res = await createEmailTemplate(mocks.deps, ADMIN, {
      name: 'new-tpl',
      type: NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_MARKETING,
      category: 'newsletter',
      status: NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_DRAFT,
      subject: 'Hi',
      htmlContent: '<p>Hi</p>',
      variablesJson: '[]',
    });
    expect(res.template?.name).toBe('new-tpl');
  });

  it('maps a unique-violation to INVALID_ARGUMENT', async () => {
    mocks.poolMock.query.mockRejectedValueOnce({ code: '23505' });
    await expect(
      createEmailTemplate(mocks.deps, ADMIN, {
        name: 'dupe',
        type: NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_TRANSACTIONAL,
        category: 'welcome',
        status: NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_DRAFT,
        subject: 's',
        htmlContent: '<p></p>',
        variablesJson: '[]',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
});

// --- updateEmailTemplate ---------------------------------------------

describe('updateEmailTemplate', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('writes only set fields', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [templateRow({ subject: 'New subject' })] });
    const res = await updateEmailTemplate(mocks.deps, ADMIN, {
      templateId: 'tpl-1',
      type: NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_UNSPECIFIED,
      status: NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_UNSPECIFIED,
      subject: 'New subject',
    });
    expect(res.template?.subject).toBe('New subject');
    const call = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(call[0]).toContain('subject = $1');
    expect(call[0]).not.toContain('type = $');
    expect(call[0]).not.toContain('status = $');
  });

  it('no-op returns the current row', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [templateRow()] }); // loadTemplate
    const res = await updateEmailTemplate(mocks.deps, ADMIN, {
      templateId: 'tpl-1',
      type: NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_UNSPECIFIED,
      status: NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_UNSPECIFIED,
    });
    expect(res.template?.templateId).toBe('tpl-1');
    // Only the SELECT ran, no UPDATE.
    expect(mocks.poolMock.query).toHaveBeenCalledTimes(1);
  });

  it('NOT_FOUND when the row is gone', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      updateEmailTemplate(mocks.deps, ADMIN, {
        templateId: 'ghost',
        type: NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_UNSPECIFIED,
        status: NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_UNSPECIFIED,
        subject: 'x',
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// --- deleteEmailTemplate ---------------------------------------------

describe('deleteEmailTemplate', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects without delete perm', async () => {
    await expect(
      deleteEmailTemplate(mocks.deps, NO_PERMS, { templateId: 'tpl-1' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('soft-deletes idempotently', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const res = await deleteEmailTemplate(mocks.deps, ADMIN, { templateId: 'tpl-1' });
    expect(res.deleted).toBe(true);
    const call = mocks.poolMock.query.mock.calls[0] as [string];
    expect(call[0]).toContain('deleted_at = now()');
  });
});

// --- previewEmailTemplate --------------------------------------------

describe('previewEmailTemplate', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders the template with the supplied variables', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [templateRow()] });
    const res = await previewEmailTemplate(mocks.deps, ADMIN, {
      templateId: 'tpl-1',
      variablesJson: '{"name":"Jane"}',
    });
    expect(res.subject).toBe('Welcome Jane');
    expect(res.htmlContent).toBe('<p>Hi Jane</p>');
    expect(res.textContent).toBe('Hi Jane');
  });

  it('leaves unmatched placeholders intact', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [templateRow()] });
    const res = await previewEmailTemplate(mocks.deps, ADMIN, {
      templateId: 'tpl-1',
      variablesJson: '{}',
    });
    expect(res.subject).toBe('Welcome {{name}}');
  });

  it('rejects a non-object variables_json', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [templateRow()] });
    await expect(
      previewEmailTemplate(mocks.deps, ADMIN, {
        templateId: 'tpl-1',
        variablesJson: '["not","an","object"]',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
});
