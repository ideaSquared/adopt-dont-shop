import { test, expect } from '../../fixtures';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { createAdopterApplication } from '../../helpers/seeds';

/**
 * A rescue reviews and approves an application entirely in the rescue app.
 *
 * application-review.spec.ts moves the status through the API. Driving the UI
 * showed staff could not do it themselves: the gateway sends the stage
 * lower-case, so the review panel offered "No stage transitions available for
 * pending", and the stage modal never asked for the approve/reject decision
 * that "Make Final Decision" needs.
 */
test.describe('rescue application review in the UI', () => {
  test('staff start a review and approve the application, and the adopter sees it approved @smoke', async ({
    page,
    apiAs,
  }) => {
    const adopterApi = await apiAs('adopter');
    const rescueApi = await apiAs('rescue');
    const { applicationId, petId } = await createAdopterApplication(adopterApi, rescueApi);
    const petRes = await rescueApi.context.get(`/api/v1/pets/${petId}`);
    const { data: pet } = (await petRes.json()) as { data: { name: string } };

    await page.goto('/applications');
    await dismissCookieBannerWhenShown(page);

    const row = page.getByRole('row').filter({ hasText: pet.name });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.getByRole('button', { name: 'View' }).click();

    const transition = async (action: RegExp, choice?: string) => {
      await page.getByRole('button', { name: 'Transition Stage' }).click();
      await page.getByRole('button', { name: action }).click();
      if (choice) {
        await page.getByRole('button', { name: choice, exact: true }).click();
      }
      await page.getByRole('button', { name: 'Confirm Transition' }).click();
      await expect(
        page.getByRole('heading', { name: 'Transition Application Stage' })
      ).toBeHidden();
    };

    await transition(/begin reviewing/i);
    await transition(/make the final approval/i, 'Approve');

    await expect(row.getByRole('cell', { name: 'Approved', exact: true })).toBeVisible({
      timeout: 15_000,
    });

    const adopterView = await adopterApi.context.get(`/api/v1/applications/${applicationId}`);
    const { data: application } = (await adopterView.json()) as { data: { status: string } };
    expect(application.status).toBe('approved');
  });
});
