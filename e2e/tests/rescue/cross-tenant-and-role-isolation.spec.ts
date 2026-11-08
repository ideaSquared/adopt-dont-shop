import { test, expect, type ApiClient } from '../../fixtures';
import { ROLES } from '../../fixtures/roles';
import { deleteWithCsrf, patchWithCsrf, postWithCsrf } from '../../helpers/seeds';
import { URLS } from '../../playwright.config';

/**
 * RES-025: a rescue cannot read or change another rescue's pets.
 * X-010: an adopter's credentials get no access to the rescue or admin apps.
 */
type PetView = {
  pet_id: string;
  name: string;
  rescue_id: string;
  status: string;
  short_description: string;
  archived: boolean;
};

const DENIED = [403, 404];

// Only a refusal by the pets service counts. A 404 from Fastify for a route that does
// not exist ("Route POST:/... not found") would also be in DENIED but proves nothing
// about tenancy.
const expectRefusedByAuthorisation = async (
  response: Awaited<ReturnType<typeof postWithCsrf>>
): Promise<void> => {
  expect(DENIED).toContain(response.status());
  expect(await response.text()).not.toMatch(/Route (GET|POST|PUT|PATCH|DELETE):.* not found/);
};

const happyTailsPet = async (adminApi: ApiClient): Promise<PetView> => {
  const rescues = (await (
    await adminApi.context.get('/api/v1/rescues', { params: { search: 'Happy Tails', limit: 20 } })
  ).json()) as { data: Array<{ rescue_id: string; name: string }> };
  const rescue = rescues.data.find(candidate => candidate.name === 'Happy Tails Rescue');
  if (!rescue) {
    throw new Error('Happy Tails Rescue not found — run `pnpm db:seed`');
  }
  const pets = (await (
    await adminApi.context.get('/api/v1/pets', {
      params: { rescueId: rescue.rescue_id, status: 'all', limit: 20 },
    })
  ).json()) as { data: PetView[] };
  // A pet that is not public (not_available): a public one is legitimately readable by any
  // signed-in user, which would make "cannot open it by id" untrue by design. Other specs
  // add available pets to this rescue, so pick the hidden one explicitly.
  const pet = pets.data.find(
    candidate => candidate.rescue_id === rescue.rescue_id && candidate.status === 'not_available'
  );
  if (!pet) {
    throw new Error('Happy Tails Rescue has no not_available pet — run `pnpm db:seed`');
  }
  return pet;
};

test.describe("another rescue's pets (RES-025)", () => {
  test('a Paws rescue user cannot read or change a Happy Tails pet', async ({ apiAs }) => {
    const rescueApi = await apiAs('rescue');
    const adminApi = await apiAs('admin');
    const pet = await happyTailsPet(adminApi);
    const petUrl = `/api/v1/pets/${pet.pet_id}`;

    // Cannot open it by id.
    await expectRefusedByAuthorisation(await rescueApi.context.get(petUrl));

    // Cannot edit (PATCH /pets/:id), re-status (POST /pets/:id/status) or delete it.
    // These are the routes the gateway registers; there is no PUT on a pet.
    const toStatus = pet.status === 'pending' ? 'on_hold' : 'pending';
    const attempts = await Promise.all([
      patchWithCsrf(rescueApi.context, petUrl, { shortDescription: 'taken over' }),
      postWithCsrf(rescueApi.context, `${petUrl}/status`, { toStatus, reason: 'taken over' }),
      deleteWithCsrf(rescueApi.context, petUrl),
    ]);
    for (const response of attempts) {
      await expectRefusedByAuthorisation(response);
    }

    // Asking for the other rescue's list still returns none of its pets.
    const listed = (await (
      await rescueApi.context.get('/api/v1/pets', {
        params: { rescueId: pet.rescue_id, status: 'all', limit: 50 },
      })
    ).json()) as { data: PetView[] };
    expect(listed.data.filter(candidate => candidate.rescue_id === pet.rescue_id)).toEqual([]);

    // And the pet is exactly as it was.
    const after = (await (await adminApi.context.get(petUrl)).json()) as { data: PetView };
    expect(after.data).toMatchObject({
      status: pet.status,
      short_description: pet.short_description,
      archived: false,
    });
  });
});

test.describe('an adopter on the rescue and admin apps (X-010)', () => {
  const apps = [
    { name: 'rescue app', url: URLS.rescue, message: /this app is for rescue_staff users only/i },
    { name: 'admin app', url: URLS.admin, message: /this app is for admin .* users only/i },
  ];

  for (const app of apps) {
    test(`the ${app.name} refuses adopter credentials`, async ({ browser }) => {
      const context = await browser.newContext({
        baseURL: app.url,
        storageState: { cookies: [], origins: [] },
      });
      try {
        const page = await context.newPage();
        await page.goto('/login');
        await page.getByLabel(/email/i).first().fill(ROLES.adopter.email);
        await page
          .getByLabel(/password/i)
          .first()
          .fill(ROLES.adopter.password);
        await page
          .getByRole('button', { name: /^(sign in|log ?in)$/i })
          .first()
          .click();

        await expect(page.getByRole('alert').first()).toContainText(app.message);
        await expect(page).toHaveURL(/\/login$/);

        // Still signed out: the app's pages bounce back to the login screen.
        await page.goto('/');
        await expect(page).toHaveURL(/\/login$/);
      } finally {
        await context.close();
      }
    });
  }

  test('an adopter token is refused by rescue-staff and admin endpoints', async ({ apiAs }) => {
    const adopterApi = await apiAs('adopter');
    const rescueOnlyAndAdminEndpoints = [
      '/api/v1/staff/colleagues',
      '/api/v1/foster/placements',
      '/api/v1/events',
      '/api/v1/reports',
      '/api/v1/admin/users',
    ];

    const statuses = await Promise.all(
      rescueOnlyAndAdminEndpoints.map(async url => (await adopterApi.context.get(url)).status())
    );

    expect(statuses).toEqual(rescueOnlyAndAdminEndpoints.map(() => 403));
  });

  test('a rescue-staff token is refused by admin endpoints', async ({ apiAs }) => {
    const rescueApi = await apiAs('rescue');

    const response = await rescueApi.context.get('/api/v1/admin/users');

    expect(response.status()).toBe(403);
  });
});
