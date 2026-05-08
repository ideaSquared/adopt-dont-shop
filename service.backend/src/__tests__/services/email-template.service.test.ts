/**
 * Behaviour tests for EmailTemplateService (email-template.service).
 *
 * The service manages the set of default email templates used throughout
 * the application (welcome, password reset, application update, etc.).
 * We verify:
 *   - getDefaultTemplateDefinitions returns the expected template catalogue
 *   - getTemplateForLocale locale-fallback chain works correctly
 *   - getDefaultTemplate delegates to the DB model appropriately
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub the DB models — we don't want real DB queries for template lookup tests.
vi.mock('../../models/EmailTemplate', () => {
  const TemplateCategory = {
    WELCOME: 'welcome',
    PASSWORD_RESET: 'password_reset',
    APPLICATION_UPDATE: 'application_update',
    ADOPTION_CONFIRMATION: 'adoption_confirmation',
    EMAIL_VERIFICATION: 'email_verification',
  };
  const TemplateStatus = { ACTIVE: 'active', INACTIVE: 'inactive' };
  const TemplateType = { TRANSACTIONAL: 'transactional', NOTIFICATION: 'notification' };

  const findOneMock = vi.fn();
  return {
    default: { findOne: findOneMock, create: vi.fn() },
    TemplateCategory,
    TemplateStatus,
    TemplateType,
    __findOneMock: findOneMock,
  };
});

vi.mock('../../models/EmailTemplateVersion', () => ({
  default: { create: vi.fn() },
}));

import EmailTemplateService from '../../services/email-template.service';
import EmailTemplate, { TemplateCategory, TemplateStatus } from '../../models/EmailTemplate';

const findOneMock = EmailTemplate.findOne as ReturnType<typeof vi.fn>;

beforeEach(() => {
  findOneMock.mockReset();
});

describe('EmailTemplateService.getDefaultTemplateDefinitions', () => {
  it('returns a non-empty array of template definitions', () => {
    const defs = EmailTemplateService.getDefaultTemplateDefinitions();
    expect(defs.length).toBeGreaterThan(0);
  });

  it('includes a Welcome Email template', () => {
    const defs = EmailTemplateService.getDefaultTemplateDefinitions();
    const welcome = defs.find(t => t.name === 'Welcome Email');
    expect(welcome).toBeDefined();
    expect(welcome?.category).toBe(TemplateCategory.WELCOME);
  });

  it('includes a Password Reset template', () => {
    const defs = EmailTemplateService.getDefaultTemplateDefinitions();
    const reset = defs.find(t => t.name === 'Password Reset');
    expect(reset).toBeDefined();
    expect(reset?.category).toBe(TemplateCategory.PASSWORD_RESET);
  });

  it('includes an Application Status Update template', () => {
    const defs = EmailTemplateService.getDefaultTemplateDefinitions();
    const appUpdate = defs.find(t => t.category === TemplateCategory.APPLICATION_UPDATE);
    expect(appUpdate).toBeDefined();
  });

  it('includes an Email Verification template', () => {
    const defs = EmailTemplateService.getDefaultTemplateDefinitions();
    const verify = defs.find(t => t.category === TemplateCategory.EMAIL_VERIFICATION);
    expect(verify).toBeDefined();
  });

  it('all templates have required fields populated', () => {
    const defs = EmailTemplateService.getDefaultTemplateDefinitions();
    for (const def of defs) {
      expect(def.name).toBeTruthy();
      expect(def.subject).toBeTruthy();
      expect(def.htmlContent).toBeTruthy();
      expect(def.locale).toBeTruthy();
      expect(def.variables).toBeInstanceOf(Array);
    }
  });

  it('all templates are marked as default', () => {
    const defs = EmailTemplateService.getDefaultTemplateDefinitions();
    expect(defs.every(t => t.isDefault)).toBe(true);
  });
});

describe('EmailTemplateService.getDefaultTemplate', () => {
  it('returns null when no matching template exists in the database', async () => {
    findOneMock.mockResolvedValueOnce(null);
    const result = await EmailTemplateService.getDefaultTemplate(TemplateCategory.WELCOME);
    expect(result).toBeNull();
  });

  it('queries with the correct category, locale, isDefault, and status', async () => {
    const fakeTemplate = { templateId: 't-1', name: 'Welcome Email' };
    findOneMock.mockResolvedValueOnce(fakeTemplate);

    const result = await EmailTemplateService.getDefaultTemplate(TemplateCategory.WELCOME, 'fr');

    expect(result).toBe(fakeTemplate);
    expect(findOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: TemplateCategory.WELCOME,
          locale: 'fr',
          isDefault: true,
          status: TemplateStatus.ACTIVE,
        }),
      })
    );
  });

  it('defaults to "en" locale when none is provided', async () => {
    findOneMock.mockResolvedValueOnce(null);
    await EmailTemplateService.getDefaultTemplate(TemplateCategory.PASSWORD_RESET);

    expect(findOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ locale: 'en' }),
      })
    );
  });
});

describe('EmailTemplateService.getTemplateForLocale', () => {
  it('returns the exact-match template when available', async () => {
    const fakeTemplate = { templateId: 't-fr-CA', locale: 'fr-CA' };
    findOneMock.mockResolvedValueOnce(fakeTemplate);

    const result = await EmailTemplateService.getTemplateForLocale(
      TemplateCategory.WELCOME,
      'fr-CA'
    );
    expect(result).toBe(fakeTemplate);
    // Only one DB call needed when the first lookup succeeds
    expect(findOneMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the language-only locale when exact match is absent', async () => {
    const fakeTemplate = { templateId: 't-fr', locale: 'fr' };
    // first call (fr-CA) → null, second call (fr) → found
    findOneMock.mockResolvedValueOnce(null).mockResolvedValueOnce(fakeTemplate);

    const result = await EmailTemplateService.getTemplateForLocale(
      TemplateCategory.WELCOME,
      'fr-CA'
    );
    expect(result).toBe(fakeTemplate);
    expect(findOneMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to "en" when neither exact nor language-only match is found', async () => {
    const enTemplate = { templateId: 't-en', locale: 'en' };
    // fr-CA → null, fr → null, en → found
    findOneMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(enTemplate);

    const result = await EmailTemplateService.getTemplateForLocale(
      TemplateCategory.WELCOME,
      'fr-CA'
    );
    expect(result).toBe(enTemplate);
    expect(findOneMock).toHaveBeenCalledTimes(3);
  });

  it('returns null when no template is found at any level of the fallback chain', async () => {
    findOneMock.mockResolvedValue(null);

    const result = await EmailTemplateService.getTemplateForLocale(TemplateCategory.WELCOME, 'xx');
    expect(result).toBeNull();
  });

  it('does not make duplicate DB calls for the same locale in the chain', async () => {
    // When requesting "en", the chain is ["en", "en", "en"] — deduplicated to one call.
    findOneMock.mockResolvedValueOnce(null);

    await EmailTemplateService.getTemplateForLocale(TemplateCategory.WELCOME, 'en');
    expect(findOneMock).toHaveBeenCalledTimes(1);
  });
});
