import { test, expect } from '../../fixtures';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { petCardLocator } from '../../helpers/pet';
import { uniquePetName } from '../../helpers/factories';
import {
  createAvailablePet,
  favouritePet,
  deleteWithCsrf,
  expectOk,
  getMyRescueId,
  postWithCsrf,
} from '../../helpers/seeds';
import { skipSwipeIntro } from '../../helpers/swipe-intro';

const SEEDED_RESCUE = 'Paws Rescue';
const STACK_TRACE = /(\bat \w+.*\(.*:\d+:\d+\)|TypeError|ReferenceError|SQLSTATE|stack trace)/i;

type PetView = {
  pet_id: string;
  name: string;
  breed?: string;
  long_description?: string;
  rescue_id?: string;
  images?: unknown[];
};

test.describe('client browsing journeys', () => {
  test.beforeEach(async ({ page }) => {
    await skipSwipeIntro(page);
    await dismissCookieBannerPatiently(page);
  });

  // CLI-021
  test('the header navigation links reach Discover, Search, Favorites and Top Picks', async ({
    page,
  }) => {
    await page.goto('/');
    const nav = page.getByRole('banner');
    const targets = [
      { link: /^Search/, url: /\/search$/ },
      { link: /^Favorites/, url: /\/favorites$/ },
      // Top Picks sends a visitor with no saved preferences to onboarding first.
      { link: /^Top Picks/, url: /\/(match\/top-picks|onboarding)$/ },
      { link: /^Discover/, url: /\/discover$/ },
    ];
    for (const { link, url } of targets) {
      await nav.getByRole('link', { name: link }).first().click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
        timeout: 20_000,
      });
    }
  });

  // CLI-030 / CLI-031 / CLI-032
  test('discover shows a pet card and Like and Pass advance the stack and the session counters', async ({
    page,
  }) => {
    await page.goto('/discover');
    await expect(page.getByRole('heading', { name: 'Discover Pets' })).toBeVisible({
      timeout: 20_000,
    });

    const like = page.getByRole('button', { name: /^Like (?!this pet)/ });
    await expect(like).toBeAttached({ timeout: 20_000 });
    const firstName = ((await like.textContent()) ?? '').replace(/^Like /, '');
    expect(firstName).not.toBe('');
    // CLI-032: the front card shows the pet's name and basic facts.
    await expect(page.getByRole('heading', { name: firstName }).first()).toBeVisible();

    const stats = page.getByText('Session Progress').locator('..');
    await expect(stats).toContainText('0Total0Likes0Super0Pass');

    await page.getByRole('button', { name: 'Like this pet', exact: true }).click();
    await expect(stats).toContainText('1Total1Likes0Super0Pass');

    const secondName = ((await like.textContent()) ?? '').replace(/^Like /, '');
    expect(secondName).not.toBe(firstName);

    await page.getByRole('button', { name: 'Pass on this pet', exact: true }).click();
    await expect(stats).toContainText('2Total1Likes0Super1Pass');
    const thirdName = ((await like.textContent()) ?? '').replace(/^Like /, '');
    expect(thirdName).not.toBe(secondName);

    // CLI-032: "View pet details" opens the pet on screen.
    await page.getByRole('button', { name: 'View pet details' }).click();
    await expect(page).toHaveURL(/\/pets\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1, name: thirdName })).toBeVisible({
      timeout: 20_000,
    });
  });

  // CLI-031 (server side). Swipes were not persisted (swipe/action answered 500) until #1603.
  test('a Like is persisted by the swipe API', async ({ page }) => {
    await page.goto('/discover');
    await expect(page.getByRole('button', { name: 'Like this pet', exact: true })).toBeVisible({
      timeout: 20_000,
    });
    const recorded = page.waitForResponse(
      res =>
        res.url().endsWith('/api/v1/discovery/swipe/action') && res.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Like this pet', exact: true }).click();
    expect((await recorded).ok()).toBe(true);
  });

  // CLI-033
  test('discover shows an end-of-queue message when there are no more pets', async ({ page }) => {
    await page.route('**/api/v1/discovery/queue', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ pets: [], hasMore: false, currentIndex: 0, nextBatchSize: 20 }),
      })
    );
    await page.route('**/api/v1/discovery/pets/more', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ pets: [], hasMore: false }),
      })
    );
    await page.goto('/discover');
    await expect(page.getByRole('heading', { name: 'No more pets to discover' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: /^Like (?!this pet)/ })).toHaveCount(0);
  });

  // CLI-040
  test('searching by a pet name returns exactly that pet', async ({ page, apiAs }) => {
    const { name } = await createAvailablePet(await apiAs('rescue'), 'Findable');
    await page.goto('/search');
    await page.getByRole('textbox', { name: 'Search' }).fill(name);

    await expect(page.getByRole('heading', { level: 2, name: '1 Pet Found' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(petCardLocator(page)).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 3, name })).toBeVisible();
  });

  test('searching by breed only returns pets of that breed', async ({ page }) => {
    await page.goto('/search');
    await page.getByRole('textbox', { name: 'Search' }).fill('Labrador');
    await expect(page.getByRole('heading', { level: 2, name: /Pets? Found/ })).not.toHaveText(
      /^0 /,
      { timeout: 20_000 }
    );
    const cards = petCardLocator(page);
    await expect(cards.first()).toBeVisible();
    await expect(cards.filter({ hasNotText: /labrador/i })).toHaveCount(0);
  });

  // CLI-041
  test('the pet type filter narrows the results and Clear Filters restores them', async ({
    page,
  }) => {
    await page.goto('/search');
    const total = page.getByRole('heading', { level: 2, name: /Pets? Found/ });
    await expect(total).toBeVisible({ timeout: 20_000 });
    const unfiltered = await total.innerText();

    await page.getByRole('combobox', { name: 'Pet Type' }).click();
    await page.getByRole('option', { name: 'Cats' }).click();

    await expect(total).not.toHaveText(unfiltered, { timeout: 20_000 });
    const narrowed = await total.innerText();
    const cards = petCardLocator(page);
    await expect(cards.first()).toBeVisible();
    await expect(cards.filter({ hasNotText: /Type:\s*cat/i })).toHaveCount(0);

    // Other specs add dogs while this runs, so the unfiltered total may have grown: assert
    // the filter is gone (the total is no longer the cats-only count), not an exact total.
    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await expect(total).not.toHaveText(narrowed, { timeout: 20_000 });
  });

  // CLI-042
  test('a search with no matches says so and offers to clear the filters', async ({ page }) => {
    await page.goto('/search');
    await page.getByRole('textbox', { name: 'Search' }).fill('zzzz-no-pet-named-this-xyzqq');
    await expect(page.getByText('No pets match your filters')).toBeVisible({ timeout: 20_000 });
    await expect(petCardLocator(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Clear All Filters' })).toBeVisible();
  });

  // CLI-043
  test('pagination moves between pages of results', async ({ page }) => {
    await page.goto('/search');
    const pageInfo = page.getByText(/Showing page \d+ of \d+/);
    await expect(pageInfo).toContainText('Showing page 1 of', { timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
    const firstPageNames = await petCardLocator(page)
      .getByRole('heading', { level: 3 })
      .allInnerTexts();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(pageInfo).toContainText('Showing page 2 of');
    await expect(page.getByRole('button', { name: 'Previous' })).toBeEnabled();
    await expect
      .poll(async () => petCardLocator(page).getByRole('heading', { level: 3 }).allInnerTexts())
      .not.toEqual(firstPageNames);

    await page.getByRole('button', { name: 'Previous' }).click();
    await expect(pageInfo).toContainText('Showing page 1 of');
  });

  // CLI-050
  test('a pet page shows photos, breed, age, description and the rescue profile link', async ({
    page,
    apiAs,
  }) => {
    // The seed has no fully described pet, so this test creates its own: a seeded breed
    // name, a long description, and several photos (same-origin upload paths are the only
    // image URLs the pets service stores in a test stack).
    const rescueApi = await apiAs('rescue');
    const rescueId = await getMyRescueId(rescueApi);
    const breedsRes = await rescueApi.context.get('/api/v1/pets/breeds/dog');
    await expectOk(breedsRes, 'GET /pets/breeds/dog');
    const [breed] = ((await breedsRes.json()) as { data: string[] }).data;
    expect(breed, 'the seed has at least one dog breed').toBeTruthy();
    const name = uniquePetName('Described');
    const longDescription = `${name} loves long walks, quiet evenings and every child she meets.`;
    const createRes = await postWithCsrf(rescueApi.context, '/api/v1/pets', {
      name,
      rescue_id: rescueId,
      type: 'dog',
      gender: 'female',
      size: 'medium',
      age_group: 'adult',
      age_years: 3,
      breed,
      short_description: 'e2e described pet',
      long_description: longDescription,
      images: ['/uploads/e2e-described-1.jpg', '/uploads/e2e-described-2.jpg'],
    });
    await expectOk(createRes, 'create a described pet');
    const { data: created } = (await createRes.json()) as { data: { pet_id: string } };
    const viewRes = await (await apiAs('adopter')).context.get(`/api/v1/pets/${created.pet_id}`);
    await expectOk(viewRes, 'GET the described pet');
    const pet = ((await viewRes.json()) as { data: PetView }).data;
    expect(pet.images).toHaveLength(2);

    await page.goto(`/pets/${pet.pet_id}`);
    await expect(page.getByRole('heading', { level: 1, name: pet.name })).toBeVisible({
      timeout: 20_000,
    });
    const details = page.getByRole('heading', { name: 'Pet Details' }).locator('..');
    await expect(details).toContainText(pet.breed ?? '');
    await expect(details).toContainText(/Age\s*\d+\s*(year|month)/i);
    await expect(page.getByRole('heading', { name: `About ${pet.name}` })).toBeVisible();
    await expect(page.getByText(pet.long_description ?? '')).toBeVisible();
    await expect(page.getByAltText(pet.name, { exact: true })).toHaveAttribute(
      'src',
      /e2e-described-1\.jpg$/
    );
    await expect(page.getByRole('button', { name: /^View photo \d+ of / })).toHaveCount(
      pet.images?.length ?? 0
    );
    await expect(page.getByRole('link', { name: 'View Rescue Profile' })).toHaveAttribute(
      'href',
      `/rescues/${pet.rescue_id}`
    );
  });

  // CLI-051
  test('un-favouriting a pet from its page sticks after a refresh and removes it from Favorites', async ({
    page,
    apiAs,
  }) => {
    const { petId, name } = await createAvailablePet(await apiAs('rescue'), 'Unfav');
    await favouritePet(await apiAs('adopter'), petId);

    await page.goto('/favorites');
    await expect(petCardLocator(page).filter({ hasText: name })).toBeVisible({ timeout: 20_000 });

    await page.goto(`/pets/${petId}`);
    await page.getByRole('button', { name: /favorited/i }).click();
    await expect(page.getByRole('button', { name: /add to favorites/i })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: /add to favorites/i })).toBeVisible({
      timeout: 20_000,
    });
    await page.goto('/favorites');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name })).toHaveCount(0);
  });

  // swipe-and-favourite replacement helper check: API removal also reflects in the UI
  test('a favourite removed through the API disappears from the Favorites page', async ({
    page,
    apiAs,
  }) => {
    const adopterApi = await apiAs('adopter');
    const { petId, name } = await createAvailablePet(await apiAs('rescue'), 'FavGone');
    await favouritePet(adopterApi, petId);

    await page.goto('/favorites');
    await expect(petCardLocator(page).filter({ hasText: name })).toBeVisible({ timeout: 20_000 });

    await expectOk(
      await deleteWithCsrf(adopterApi.context, `/api/v1/pets/${petId}/favorite`),
      'remove favourite'
    );
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name })).toHaveCount(0);
  });

  // CLI-053 / CLI-060
  test('a pet page links to its rescue profile, which lists the rescue and its pets', async ({
    page,
    apiAs,
  }) => {
    // KNOWN APP BUG: /rescues/:id renders "Rescue Not Found" although both of its API
    // calls return 200. Remove test.fail() once the page renders the profile.
    test.fail(true, 'rescue profile page shows Rescue Not Found for a valid rescue');
    const { petId, name } = await createAvailablePet(await apiAs('rescue'), 'Linked');
    await page.goto(`/pets/${petId}`);
    await page.getByRole('link', { name: 'View Rescue Profile' }).click();

    await expect(page).toHaveURL(/\/rescues\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1, name: SEEDED_RESCUE })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { name: `About ${SEEDED_RESCUE}` })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contact Information' })).toBeVisible();
    await expect(page.getByRole('heading', { name: `Pets from ${SEEDED_RESCUE}` })).toBeVisible();
    await expect(petCardLocator(page).first()).toBeVisible();
    void name;
  });

  // CLI-054 / CLI-060 (error side)
  test('an unknown pet or rescue id shows a friendly not-found page', async ({ page }) => {
    for (const id of ['00000000-0000-0000-0000-000000000000', 'not-a-uuid']) {
      await page.goto(`/pets/${id}`);
      await expect(page.getByRole('heading', { name: 'Pet Not Found' })).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByRole('link', { name: 'Back to Home' })).toBeVisible();
      await expect(page.getByRole('main')).not.toContainText(STACK_TRACE);
    }

    await page.goto('/rescues/00000000-0000-0000-0000-000000000000');
    await expect(page.getByRole('heading', { name: 'Rescue Not Found' })).toBeVisible({
      timeout: 20_000,
    });
  });
});
