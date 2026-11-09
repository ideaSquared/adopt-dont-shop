import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Route, Routes } from 'react-router';
import { render, screen, fireEvent, waitFor } from '../test-utils';

/**
 * /pets/:petId deep-links a single pet: the page opens that pet in its
 * detail form, and closing the form returns to /pets.
 */

const { getPetByIdMock } = vi.hoisted(() => ({ getPetByIdMock: vi.fn() }));

vi.mock('@adopt-dont-shop/lib.pets', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@adopt-dont-shop/lib.pets');
  return {
    ...actual,
    petsService: { getPetById: getPetByIdMock },
    petManagementService: {
      getMyRescuePets: vi.fn().mockResolvedValue({
        pets: [],
        pagination: { totalPages: 1, hasNext: false, hasPrev: false },
      }),
    },
  };
});

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ user: { userId: 'staff-1', rescueId: 'rescue-1' }, refreshUser: vi.fn() }),
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
    <Routes>
      <Route path="/pets/:petId?" element={<PetManagement />} />
    </Routes>
  );
};

describe('PetManagement deep link', () => {
  beforeEach(() => {
    getPetByIdMock.mockReset();
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

  it('opens no pet form on the plain list', async () => {
    renderAt('/pets');

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.queryByRole('dialog', { name: 'Pet form' })).not.toBeInTheDocument();
    expect(getPetByIdMock).not.toHaveBeenCalled();
  });
});
