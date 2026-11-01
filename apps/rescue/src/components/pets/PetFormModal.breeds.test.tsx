/**
 * Behavioural tests for the breed pickers in the rescue PetFormModal.
 *
 * The pets service only accepts a breed NAME that exists in pets.breeds for
 * the pet's type (anything else is a 400), so the form offers the known names
 * from GET /api/v1/pets/breeds/:type instead of a free-text box.
 *
 * Runs against the real lib.components (the global test setup stubs
 * SelectInput as a bare <select>), the real apiService, and MSW.
 */

import { apiService } from '@adopt-dont-shop/lib.api';
import type { Pet, PetCreateData, PetUpdateData } from '@adopt-dont-shop/lib.pets';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, waitFor, within } from '../../test-utils/render';
import PetFormModal from './PetFormModal';

vi.unmock('@adopt-dont-shop/lib.components');

// Radix Select (behind SelectInput) needs these jsdom gaps filled.
Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', { value: vi.fn() });
Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { value: vi.fn() });
Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', { value: vi.fn() });
Element.prototype.scrollIntoView = vi.fn();
// Must be a regular function: Radix calls it with `new`, which the global
// setup's arrow-style mock cannot handle.
globalThis.ResizeObserver = vi.fn().mockImplementation(function () {
  return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
});

const API = 'http://localhost:5000';

const BREEDS: Record<string, string[]> = {
  dog: ['Border Collie', 'Labrador Retriever', 'Poodle'],
  cat: ['Domestic Shorthair', 'Siamese'],
  bird: [],
};

const server = setupServer(
  http.get(`${API}/api/v1/pets/breeds/:type`, ({ params }) =>
    HttpResponse.json({ success: true, data: BREEDS[String(params.type)] ?? [] })
  )
);

beforeAll(() => {
  apiService.updateConfig({ apiUrl: API });
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type SubmitArg = PetCreateData | PetUpdateData;

const renderForm = (pet?: Pet) => {
  const onSubmit = vi.fn((_data: SubmitArg) => Promise.resolve());
  renderWithProviders(
    <PetFormModal isOpen={true} pet={pet} onClose={() => {}} onSubmit={onSubmit} />
  );
  return { onSubmit };
};

const openAndListOptions = async (
  user: ReturnType<typeof userEvent.setup>,
  label: RegExp
): Promise<string[]> => {
  await user.click(screen.getByRole('combobox', { name: label }));
  const listbox = await screen.findByRole('listbox');
  return within(listbox)
    .getAllByRole('option')
    .map(option => option.textContent ?? '');
};

const choose = async (user: ReturnType<typeof userEvent.setup>, label: RegExp, option: string) => {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
};

describe('PetFormModal — breed pickers', () => {
  it('lists the breeds for the selected type', async () => {
    const user = userEvent.setup();
    renderForm();

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /primary breed/i })).toBeEnabled()
    );
    const options = await openAndListOptions(user, /primary breed/i);

    expect(options).toEqual(['Not specified', 'Border Collie', 'Labrador Retriever', 'Poodle']);
  });

  it('sends the name of the breed the user picks', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/pet name/i), 'Buddy');
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /primary breed/i })).toBeEnabled()
    );
    await choose(user, /primary breed/i, 'Labrador Retriever');
    await user.click(screen.getByRole('button', { name: /add pet/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'Buddy', breed: 'Labrador Retriever' });
  });

  it('offers a "None" choice for the optional secondary breed', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/pet name/i), 'Buddy');
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /secondary breed/i })).toBeEnabled()
    );
    const options = await openAndListOptions(user, /secondary breed/i);
    expect(options[0]).toBe('None');

    await user.click(screen.getByRole('option', { name: 'Poodle' }));
    await user.click(screen.getByRole('button', { name: /add pet/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ secondaryBreed: 'Poodle' });
  });

  it('clears a chosen breed when the pet type changes, and offers the new type’s breeds', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/pet name/i), 'Misty');
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /primary breed/i })).toBeEnabled()
    );
    await choose(user, /primary breed/i, 'Labrador Retriever');
    await choose(user, /secondary breed/i, 'Poodle');

    await user.selectOptions(screen.getByLabelText(/pet type/i), 'cat');

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /primary breed/i })).not.toHaveTextContent(
        'Labrador Retriever'
      )
    );
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /primary breed/i })).toBeEnabled()
    );
    const options = await openAndListOptions(user, /primary breed/i);
    expect(options).toEqual(['Not specified', 'Domestic Shorthair', 'Siamese']);
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: /add pet/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.type).toBe('cat');
    expect(submitted.breed).toBe('');
    expect(submitted.secondaryBreed ?? '').toBe('');
  });

  it('shows a loading state while the breeds load', async () => {
    server.use(
      http.get(`${API}/api/v1/pets/breeds/:type`, async () => {
        await delay(150);
        return HttpResponse.json({ success: true, data: BREEDS.dog });
      })
    );
    renderForm();

    expect(screen.getByRole('combobox', { name: /primary breed/i })).toBeDisabled();
    expect(screen.getAllByText(/loading breeds/i).length).toBeGreaterThan(0);

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /primary breed/i })).toBeEnabled()
    );
    expect(screen.queryByText(/loading breeds/i)).toBeNull();
  });

  it('says so when a type has no breeds listed', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText(/pet type/i), 'bird');

    expect((await screen.findAllByText(/no breeds are listed/i)).length).toBeGreaterThan(0);
  });

  it('does not block saving when the breeds cannot be loaded', async () => {
    server.use(
      http.get(`${API}/api/v1/pets/breeds/:type`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 })
      )
    );
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    expect((await screen.findAllByText(/couldn.t load breeds/i)).length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText(/pet name/i), 'Buddy');
    await user.click(screen.getByRole('button', { name: /add pet/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });
});

describe('PetFormModal — editing a pet whose saved breed is in the list', () => {
  it('keeps the saved breed selected once the list has loaded', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ pet_id: 'pet-1', name: 'Rex', type: 'dog', breed: 'Poodle' });

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /primary breed/i })).toBeEnabled()
    );
    expect(screen.getByRole('combobox', { name: /primary breed/i })).toHaveTextContent('Poodle');

    await user.click(screen.getByRole('button', { name: /update pet/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ breed: 'Poodle' });
  });
});

describe('PetFormModal — editing a pet whose saved breed is not in the list', () => {
  // Saved before breed names were validated, e.g. typed into the old
  // free-text box.
  const legacyPet: Pet = {
    pet_id: 'pet-1',
    name: 'Rex',
    type: 'dog',
    breed: 'Lab cross',
    short_description: 'Friendly.',
  };

  it('shows the saved breed rather than a blank field', async () => {
    renderForm(legacyPet);

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /primary breed/i })).toBeEnabled()
    );
    expect(screen.getByRole('combobox', { name: /primary breed/i })).toHaveTextContent('Lab cross');
  });

  it('re-sends the saved breed untouched when only another field changes', async () => {
    // Relies on the pets service accepting a breed name that is exactly what
    // is already stored on the pet (handlers.test.ts, "a free-text breed
    // stored before names were validated"). This test only pins the request
    // shape: the stored value goes back unchanged and is not blanked or
    // swapped for a list entry.
    const user = userEvent.setup();
    const { onSubmit } = renderForm(legacyPet);

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /primary breed/i })).toBeEnabled()
    );
    await user.type(screen.getByLabelText(/short description/i), ' Loves walks.');
    await user.click(screen.getByRole('button', { name: /update pet/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      breed: 'Lab cross',
      shortDescription: 'Friendly. Loves walks.',
    });
  });

  it('lets the user replace it with a listed breed', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm(legacyPet);

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /primary breed/i })).toBeEnabled()
    );
    await choose(user, /primary breed/i, 'Labrador Retriever');
    await user.click(screen.getByRole('button', { name: /update pet/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ breed: 'Labrador Retriever' });
  });
});
