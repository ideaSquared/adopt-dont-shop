import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Link, Route, Routes } from 'react-router';
import { toast } from '@adopt-dont-shop/lib.components';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { apiService } from '@adopt-dont-shop/lib.api';
import { petManagementService } from '@adopt-dont-shop/lib.pets';

/**
 * /pets/:petId deep-links a single pet: the page opens that pet in its
 * detail form, and closing the form returns to /pets.
 */

const { getPetByIdMock } = vi.hoisted(() => ({ getPetByIdMock: vi.fn() }));

vi.mock('@adopt-dont-shop/lib.pets', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@adopt-dont-shop/lib.pets');
  return {
    ...actual,
    petManagementService: {
      getMyRescuePets: vi.fn().mockResolvedValue({
        pets: [],
        pagination: { totalPages: 1, hasNext: false, hasPrev: false },
      }),
    },
  };
});

// The app's configured pet client (it carries the backend base URL).
vi.mock('../services/libraryServices', () => ({
  petService: { getPetById: getPetByIdMock },
}));

// GET /auth/me does not carry the rescue id; it comes from the staff membership.
vi.mock('../services/staffService', () => ({
  staffService: { getMyRescueId: vi.fn().mockResolvedValue('rescue-1') },
}));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ user: { userId: 'staff-1' }, refreshUser: vi.fn() }),
}));

vi.mock('@adopt-dont-shop/lib.api', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@adopt-dont-shop/lib.api');
  return { ...actual, apiService: { get: vi.fn().mockResolvedValue({ data: {} }) } };
});

vi.mock('../components/pets/PetFormModal.tsx', () => ({
  default: ({ pet, onClose }: { pet?: { name: string }; onClose: () => void }) => (
    <div role="dialog" aria-label="Pet form">
      <p>Editing {pet?.name}</p>
      <button onClick={onClose}>Close form</button>
    </div>
  ),
}));

import PetManagement from './PetManagement';

const renderAt = (path: string) => {
  window.history.pushState({}, '', path);
  return render(
    <>
      <Link to="/pets/pet-1">Open Buddy</Link>
      <Routes>
        <Route path="/pets/:petId?" element={<PetManagement />} />
      </Routes>
    </>
  );
};

describe('PetManagement deep link', () => {
  beforeEach(() => {
    getPetByIdMock.mockReset();
    vi.spyOn(toast, 'error').mockImplementation(() => '');
  });

  it('opens the linked pet in its detail form', async () => {
    getPetByIdMock.mockResolvedValue({ pet_id: 'pet-1', name: 'Buddy' });

    renderAt('/pets/pet-1');

    expect(await screen.findByText('Editing Buddy')).toBeInTheDocument();
    expect(getPetByIdMock).toHaveBeenCalledWith('pet-1');
  });

  it('returns to the pet list when the form is closed', async () => {
    getPetByIdMock.mockResolvedValue({ pet_id: 'pet-1', name: 'Buddy' });

    renderAt('/pets/pet-1');
    fireEvent.click(await screen.findByRole('button', { name: 'Close form' }));

    await waitFor(() => expect(window.location.pathname).toBe('/pets'));
    expect(screen.queryByRole('dialog', { name: 'Pet form' })).not.toBeInTheDocument();
  });

  it('returns to the list with an explanation when the linked pet cannot be found', async () => {
    getPetByIdMock.mockRejectedValue(new Error('pet not found'));

    renderAt('/pets/pet-gone');

    await waitFor(() => expect(window.location.pathname).toBe('/pets'));
    expect(toast.error).toHaveBeenCalledWith('That pet could not be found');
    expect(screen.queryByRole('dialog', { name: 'Pet form' })).not.toBeInTheDocument();
  });

  it('loads the pet afresh each time its link is opened, never from a stale cache', async () => {
    getPetByIdMock.mockResolvedValueOnce({ pet_id: 'pet-1', name: 'Buddy' });
    getPetByIdMock.mockResolvedValueOnce({ pet_id: 'pet-1', name: 'Buddy (renamed)' });

    renderAt('/pets/pet-1');
    fireEvent.click(await screen.findByRole('button', { name: 'Close form' }));
    await waitFor(() => expect(window.location.pathname).toBe('/pets'));

    fireEvent.click(screen.getByRole('link', { name: 'Open Buddy' }));

    expect(await screen.findByText('Editing Buddy (renamed)')).toBeInTheDocument();
    expect(getPetByIdMock).toHaveBeenCalledTimes(2);
  });

  it('opens no pet form on the plain list', async () => {
    renderAt('/pets');

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.queryByRole('dialog', { name: 'Pet form' })).not.toBeInTheDocument();
    expect(getPetByIdMock).not.toHaveBeenCalled();
  });

  it('enables CSV import once the rescue id is known from the staff membership', async () => {
    renderAt('/pets');

    await waitFor(() => expect(screen.getByRole('button', { name: 'Import CSV' })).toBeEnabled());
  });

  it('shows the rescue statistics from the dashboard endpoint', async () => {
    vi.mocked(apiService.get).mockResolvedValueOnce({
      data: { totalAnimals: 17, availableForAdoption: 4, pendingApplications: 2, adoptedPets: 1 },
    });

    renderAt('/pets');

    expect(await screen.findByText('Total Pets')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Available' })).toBeInTheDocument();
  });

  it('offers a retry when the pet list fails to load', async () => {
    vi.mocked(petManagementService.getMyRescuePets).mockRejectedValueOnce(new Error('boom'));

    renderAt('/pets');

    expect(await screen.findByText('boom')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.queryByText('boom')).not.toBeInTheDocument());
  });
});
