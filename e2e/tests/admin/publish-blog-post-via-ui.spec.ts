import { test, expect } from '../../fixtures';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { uniqueText } from '../../helpers/factories';
import { URLS } from '../../playwright.config';

/**
 * An admin writes and publishes a blog post in Content Management, and
 * visitors can read it on the public site's blog.
 *
 * blog-post-publishing.spec.ts only proves the page mounts. Driving it showed
 * the gateway never wired its CMS gRPC client, so every /api/v1/cms/* route
 * 404'd: the admin list read "Failed to load content" and the public blog
 * had nothing to show.
 */
test.describe('publishing content in the admin app', () => {
  test('an admin publishes a blog post and visitors can read it', async ({ page, browser }) => {
    const title = uniqueText('Why senior dogs make great companions');
    const body = 'Older dogs are calm, house-trained and wonderful company.';

    await page.goto('/content-management');
    await dismissCookieBannerWhenShown(page);
    await page.getByRole('button', { name: 'New Content' }).click();
    await page.getByRole('textbox', { name: 'Title *' }).fill(title);
    await page.getByRole('combobox', { name: 'Content Type' }).selectOption({ label: 'Blog Post' });
    await page.getByRole('textbox', { name: 'Content (HTML) *' }).fill(`<p>${body}</p>`);
    await page
      .getByRole('textbox', { name: 'Excerpt' })
      .fill('A short read on adopting older dogs');
    await page.getByRole('button', { name: 'Create Content' }).click();

    const row = page.getByRole('row').filter({ hasText: title });
    await expect(row.getByRole('cell', { name: 'draft' })).toBeVisible({ timeout: 15_000 });
    await row.getByRole('button', { name: 'Publish' }).click();
    await expect(row.getByRole('cell', { name: 'published' })).toBeVisible({ timeout: 15_000 });

    const visitor = await browser.newContext({ baseURL: URLS.client });
    try {
      const blog = await visitor.newPage();
      await blog.goto('/blog');
      await blog
        .getByRole('link', { name: new RegExp(title) })
        .first()
        .click();
      await expect(blog.getByRole('heading', { name: title })).toBeVisible({ timeout: 15_000 });
      await expect(blog.getByText(body)).toBeVisible();
    } finally {
      await visitor.close();
    }
  });
});
