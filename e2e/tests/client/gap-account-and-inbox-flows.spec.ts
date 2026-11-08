import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import type { ApiClient } from '../../fixtures/api';
import { createVerifiedAdopter, loginAccountViaApi } from '../../helpers/accounts';
import { loginViaUI } from '../../helpers/auth';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { uniqueText } from '../../helpers/factories';
import {
  createPrivateConversation,
  rescueSaysSomethingPrivate,
} from '../../helpers/private-conversation';
import {
  createAdopterApplication,
  expectOk,
  patchWithCsrf,
  postWithCsrf,
} from '../../helpers/seeds';
import { openSignedInSession } from '../../helpers/signed-in-session';
import { skipSwipeIntro } from '../../helpers/swipe-intro';
import { URLS } from '../../playwright.config';

const messagesLink = (page: Page) => page.getByRole('link', { name: /^Messages/ });
const notificationsLink = (page: Page) => page.getByRole('link', { name: /^Notifications/ });

const approvedApplicationNotifications = async (
  adopterApi: ApiClient,
  rescueApi: ApiClient
): Promise<void> => {
  const { applicationId } = await createAdopterApplication(adopterApi, rescueApi);
  const review = await postWithCsrf(
    rescueApi.context,
    `/api/v1/applications/${applicationId}/review`,
    {}
  );
  await expectOk(review, 'start review');
  const approve = await patchWithCsrf(
    rescueApi.context,
    `/api/v1/applications/${applicationId}/status`,
    { status: 'approved' }
  );
  await expectOk(approve, 'approve');
};

const openProfileEditForm = async (page: Page): Promise<void> => {
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Edit Profile' }).click();
  await expect(page.getByRole('heading', { name: 'Edit Profile' })).toBeVisible();
};

test.describe('client profile, password, chat and notifications', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // CLI-081
  test('the profile form flags blank and malformed fields and sends nothing', async ({
    browser,
  }) => {
    const session = await openSignedInSession(browser, await createVerifiedAdopter('profile-bad'));
    const { page } = session;
    try {
      await dismissCookieBannerPatiently(page);
      const writes: string[] = [];
      page.on('request', req => {
        const isConsentRecord = req.url().includes('/privacy/cookies-consent');
        if (req.method() !== 'GET' && req.url().includes('/api/v1/') && !isConsentRecord) {
          writes.push(`${req.method()} ${req.url()}`);
        }
      });
      await openProfileEditForm(page);

      await page.locator('#firstName').fill('');
      await page.locator('#phone').fill('call me maybe');
      await page.locator('#zipCode').fill('90210');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      await expect(page.getByText('First name is required')).toBeVisible();
      await expect(page.getByText('Please enter a valid phone number')).toBeVisible();
      await expect(page.getByText('Please enter a valid UK postcode')).toBeVisible();
      await expect(page.locator('#firstName')).toHaveAttribute('aria-invalid', 'true');
      await expect(page.locator('#phone')).toHaveAttribute('aria-invalid', 'true');
      await expect(page.locator('#zipCode')).toHaveAttribute('aria-invalid', 'true');
      // Still on the edit form, nothing was sent, nothing was stored.
      await expect(page.getByRole('heading', { name: 'Edit Profile' })).toBeVisible();
      expect(writes).toEqual([]);
      const me = await session.api.context.get('/api/v1/auth/me');
      await expectOk(me, 'read profile');
      const stored = (await me.json()) as { user: { firstName: string } };
      expect(stored.user.firstName).toBe('E2E');
    } finally {
      await session.close();
    }
  });

  // CLI-071/081: the UK formats the manual plan names are accepted and stored.
  test('UK postcode and phone formats are accepted and saved', async ({ browser }) => {
    const session = await openSignedInSession(browser, await createVerifiedAdopter('profile-uk'));
    const { page } = session;
    try {
      await dismissCookieBannerPatiently(page);
      await openProfileEditForm(page);

      await page.locator('#phone').fill('07123 456789');
      await page.locator('#zipCode').fill('SW1A 1AA');
      await page.getByRole('button', { name: 'Save Changes' }).click();

      await expect(page.getByText(/profile updated/i).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('Please enter a valid UK postcode')).toHaveCount(0);
      await expect(page.getByText('Please enter a valid phone number')).toHaveCount(0);
    } finally {
      await session.close();
    }
  });

  // CLI-081. KNOWN APP BUG: PATCH /users/account answers 200 but the user view
  // returned by /auth/me carries no phoneNumber or postalCode, so after a reload
  // the profile reads "Phone: Not provided". Remove test.fail once they persist.
  test('a saved UK phone number is still on the profile after a reload', async ({ browser }) => {
    test.fail(true, 'phone/postcode are not returned by /auth/me, so they are lost on reload');
    const session = await openSignedInSession(browser, await createVerifiedAdopter('profile-keep'));
    const { page } = session;
    try {
      await dismissCookieBannerPatiently(page);
      await openProfileEditForm(page);
      await page.locator('#phone').fill('07123 456789');
      await page.locator('#zipCode').fill('SW1A 1AA');
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await expect(page.getByText(/profile updated/i).first()).toBeVisible({ timeout: 15_000 });

      await page.reload();
      await expect(page.getByText('Phone', { exact: true }).locator('..')).toContainText(
        '07123 456789',
        { timeout: 5_000 }
      );
    } finally {
      await session.close();
    }
  });

  // CLI-082. NOT DRIVABLE: app.client has no change-password control (the
  // gateway route POST /auth/change-password exists, nothing in the UI calls it).
  test.fixme('an adopter changes their password from Settings', async ({ browser }) => {
    const session = await openSignedInSession(browser, await createVerifiedAdopter('pw-ui'));
    try {
      await session.page.goto('/profile');
      await session.page.getByRole('button', { name: 'Settings' }).click();
      await expect(session.page.getByRole('button', { name: /change password/i })).toBeVisible();
    } finally {
      await session.close();
    }
  });

  // CLI-082 (backend half): once the password is changed the new one logs in
  // through the real login form and the old one is refused.
  test('after a password change the new password signs in and the old one is rejected', async ({
    page,
  }) => {
    const account = await createVerifiedAdopter('pw-change');
    const newPassword = 'ChangedPassword456!';
    const api = await loginAccountViaApi(account);
    try {
      const res = await postWithCsrf(api.context, '/api/v1/auth/change-password', {
        currentPassword: account.password,
        newPassword,
      });
      await expectOk(res, 'change password');
    } finally {
      await api.dispose();
    }

    await skipSwipeIntro(page);
    await page.goto('/login');
    await page.getByLabel(/email/i).first().fill(account.email);
    await page
      .getByLabel(/password/i)
      .first()
      .fill(account.password);
    await page
      .getByRole('button', { name: /^(sign in|log ?in)$/i })
      .first()
      .click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);

    await loginViaUI(page, account.email, newPassword);
    await expect(page.getByRole('button', { name: /user menu for E2E Adopter/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  // CLI-102
  test('a /chat/:conversationId deep link opens that conversation and no other', async ({
    browser,
    apiAs,
  }) => {
    const rescueApi = await apiAs('rescue');
    const session = await openSignedInSession(browser, await createVerifiedAdopter('chat-deep'));
    const { page } = session;
    try {
      const first = await createPrivateConversation(session.api, rescueApi);
      const second = await createPrivateConversation(session.api, rescueApi);
      const firstNote = await rescueSaysSomethingPrivate(rescueApi, first.chatId);
      const secondNote = await rescueSaysSomethingPrivate(rescueApi, second.chatId);

      await dismissCookieBannerPatiently(page);
      await page.goto(`/chat/${second.chatId}`);
      await expect(page.getByRole('textbox', { name: /message input/i })).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByRole('article').filter({ hasText: secondNote })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByRole('article').filter({ hasText: firstNote })).toHaveCount(0);

      await page.goto(`/chat/${first.chatId}`);
      await expect(page.getByRole('article').filter({ hasText: firstNote })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByRole('article').filter({ hasText: secondNote })).toHaveCount(0);
    } finally {
      await session.close();
    }
  });

  // CLI-101
  test('a rescue reply raises the unread badge anywhere and appears live in an open chat', async ({
    browser,
    apiAs,
  }) => {
    const rescueApi = await apiAs('rescue');
    const session = await openSignedInSession(browser, await createVerifiedAdopter('chat-live'));
    const { page } = session;
    try {
      const { chatId } = await createPrivateConversation(session.api, rescueApi);
      await dismissCookieBannerPatiently(page);

      // The adopter is elsewhere on the site when the rescue writes.
      await page.goto('/search');
      await expect(messagesLink(page)).toHaveAccessibleName('Messages', { timeout: 20_000 });
      const first = await rescueSaysSomethingPrivate(rescueApi, chatId);
      await expect(messagesLink(page)).toHaveAccessibleName('Messages, 1 unread item', {
        timeout: 20_000,
      });

      // Opening the conversation shows the message and clears the badge.
      await messagesLink(page).click();
      await page
        .locator('main')
        .getByRole('button', { name: /rescue organization/i })
        .first()
        .click();
      await expect(page.getByRole('article').filter({ hasText: first })).toBeVisible({
        timeout: 15_000,
      });
      await expect(messagesLink(page)).toHaveAccessibleName('Messages', { timeout: 15_000 });

      // A reply while the chat is open arrives with no reload.
      const second = await rescueSaysSomethingPrivate(rescueApi, chatId);
      await expect(page.getByRole('article').filter({ hasText: second })).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await session.close();
    }
  });

  // CLI-110
  test('the notifications page lists, marks read and keeps the header badge in step', async ({
    browser,
    apiAs,
  }) => {
    const rescueApi = await apiAs('rescue');
    const session = await openSignedInSession(browser, await createVerifiedAdopter('notify'));
    const { page } = session;
    try {
      await approvedApplicationNotifications(session.api, rescueApi);

      await dismissCookieBannerPatiently(page);
      await page.goto('/notifications');
      await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();
      await expect(page.getByText('Application approved!')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('Application received')).toBeVisible();

      const markAll = page.getByRole('button', { name: /^Mark All Read \(\d+\)$/ });
      const label = (await markAll.textContent()) ?? '';
      const unread = Number(/\((\d+)\)/.exec(label)?.[1]);
      expect(unread).toBeGreaterThanOrEqual(2);
      await expect(notificationsLink(page)).toHaveAccessibleName(
        `Notifications, ${unread} unread items`
      );

      await markAll.click();
      await expect(page.getByRole('button', { name: /^Mark All Read/ })).toHaveCount(0);
      await expect(notificationsLink(page)).toHaveAccessibleName('Notifications');
      // Still listed, now as read, and the server agrees after a reload.
      await expect(page.getByText('Application approved!')).toBeVisible();
      await page.reload();
      await expect(page.getByText('Application approved!')).toBeVisible({ timeout: 20_000 });
      await expect(notificationsLink(page)).toHaveAccessibleName('Notifications');
      const count = await session.api.context.get('/api/v1/notifications/unread/count');
      await expectOk(count, 'unread count');
      expect(((await count.json()) as { data: { count: number } }).data.count).toBe(0);
    } finally {
      await session.close();
    }
  });

  // CLI-110. KNOWN APP BUG: opening a notification sends PATCH /notifications/mark-read
  // with the card's `id`, but the gateway lists notifications as `notificationId`, so the
  // request is 400 "notification_id must be a valid UUID" and the notification stays
  // unread. Remove test.fail when a single notification can be marked read.
  test('opening one notification marks only that one read', async ({ browser, apiAs }) => {
    test.fail(true, 'mark-read is sent an undefined id and answers 400');
    const rescueApi = await apiAs('rescue');
    const session = await openSignedInSession(browser, await createVerifiedAdopter('notify-one'));
    const { page } = session;
    try {
      await approvedApplicationNotifications(session.api, rescueApi);
      await dismissCookieBannerPatiently(page);
      await page.goto('/notifications');
      await expect(page.getByText('Application approved!')).toBeVisible({ timeout: 20_000 });
      const markAll = page.getByRole('button', { name: /^Mark All Read \(\d+\)$/ });
      const unread = Number(/\((\d+)\)/.exec((await markAll.textContent()) ?? '')?.[1]);

      await page.getByText('Application approved!').click();
      await expect(page.getByRole('button', { name: `Mark All Read (${unread - 1})` })).toBeVisible(
        {
          timeout: 5_000,
        }
      );
    } finally {
      await session.close();
    }
  });
});

// CLI-120 / CLI-121: published content, created through the admin API.
type PublishedContent = { title: string; slug: string };

const publishContent = async (
  adminApi: ApiClient,
  contentType: 'blog_post' | 'help_article'
): Promise<PublishedContent> => {
  const title = uniqueText(
    contentType === 'blog_post' ? 'Blog on senior dogs' : 'Help with fostering'
  );
  const slug = uniqueText('slug').toLowerCase();
  const created = await postWithCsrf(adminApi.context, '/api/v1/cms/content', {
    title,
    slug,
    contentType,
    content: `<p>Body text for ${title}</p>`,
    excerpt: `Excerpt for ${title}`,
  });
  await expectOk(created, `create ${contentType}`);
  const { content } = (await created.json()) as { content: { contentId: string; slug: string } };
  const published = await postWithCsrf(
    adminApi.context,
    `/api/v1/cms/content/${content.contentId}/publish`,
    {}
  );
  await expectOk(published, `publish ${contentType}`);
  return { title, slug: content.slug };
};

test.describe('client content pages', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await skipSwipeIntro(page);
    await dismissCookieBannerPatiently(page);
  });

  // CLI-120
  test('a published blog post is listed and opens at /blog/:slug', async ({ page, apiAs }) => {
    const post = await publishContent(await apiAs('admin'), 'blog_post');

    await page.goto('/blog');
    const card = page
      .getByRole('link')
      .filter({ has: page.getByRole('heading', { name: post.title }) });
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(card).toContainText(`Excerpt for ${post.title}`);
    await card.click();

    await expect(page).toHaveURL(`${URLS.client}/blog/${post.slug}`);
    await expect(page.getByRole('heading', { level: 1, name: post.title })).toBeVisible();
    await expect(page.getByText(`Body text for ${post.title}`)).toBeVisible();
    await page.getByRole('link', { name: /back to blog/i }).click();
    await expect(page).toHaveURL(`${URLS.client}/blog`);
  });

  // CLI-121
  test('a published help article is listed and opens in the help centre', async ({
    page,
    apiAs,
  }) => {
    const article = await publishContent(await apiAs('admin'), 'help_article');

    await page.goto('/help');
    await expect(page.getByRole('heading', { level: 1, name: 'Help Center' })).toBeVisible();
    const link = page
      .getByRole('link')
      .filter({ has: page.getByRole('heading', { name: article.title }) });
    await expect(link).toBeVisible({ timeout: 20_000 });
    await link.click();

    await expect(page).toHaveURL(`${URLS.client}/help/${article.slug}`);
    await expect(page.getByRole('heading', { level: 1, name: article.title })).toBeVisible();
    await expect(page.getByText(`Body text for ${article.title}`)).toBeVisible();
    await page.getByRole('link', { name: /back to help center/i }).click();
    await expect(page).toHaveURL(`${URLS.client}/help`);
  });
});
