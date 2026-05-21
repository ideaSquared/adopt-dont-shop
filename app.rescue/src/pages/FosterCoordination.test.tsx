import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FosterCoordination from './FosterCoordination';
import { fosterService } from '../services/fosterService';
import { petService } from '../services/libraryServices';
import { staffService } from '../services/staffService';

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({
    user: { userId: 'user-1', rescueId: 'rescue-1' },
  }),
}));

vi.mock('../services/fosterService', () => ({
  fosterService: {
    list: vi.fn(),
    create: vi.fn(),
    end: vi.fn(),
  },
}));

vi.mock('../services/libraryServices', () => ({
  petService: {
    getPetsByRescue: vi.fn(),
  },
}));

vi.mock('../services/staffService', () => ({
  staffService: {
    getRescueStaff: vi.fn(),
  },
}));

const confirmSpy = vi.fn();

vi.mock('@adopt-dont-shop/lib.components', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@adopt-dont-shop/lib.components');
  return {
    ...actual,
    Modal: ({
      isOpen,
      title,
      children,
    }: {
      isOpen: boolean;
      title?: string;
      children: React.ReactNode;
    }) =>
      isOpen
        ? React.createElement(
            'div',
            { role: 'dialog' },
            title ? React.createElement('h2', null, title) : null,
            children
          )
        : null,
    ConfirmDialog: () => null,
    useConfirm: () => ({
      isOpen: false,
      confirm: confirmSpy,
      confirmProps: { isOpen: false, onClose: () => {}, onConfirm: () => {}, message: '' },
    }),
  };
});

const mockedFoster = fosterService as unknown as {
  list: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
};
const mockedPet = petService as unknown as {
  getPetsByRescue: ReturnType<typeof vi.fn>;
};
const mockedStaff = staffService as unknown as {
  getRescueStaff: ReturnType<typeof vi.fn>;
};

describe('FosterCoordination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmSpy.mockResolvedValue(true);
    mockedFoster.list.mockResolvedValue([]);
    mockedFoster.create.mockResolvedValue({ placementId: 'pl-1' });
    mockedFoster.end.mockResolvedValue({ placementId: 'pl-1' });
    mockedPet.getPetsByRescue.mockResolvedValue({
      data: [
        { pet_id: 'pet-1', name: 'Buddy', breed: 'Labrador' },
        { pet_id: 'pet-2', name: 'Whiskers', breed: 'Tabby' },
      ],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1, hasNext: false, hasPrev: false },
    });
    mockedStaff.getRescueStaff.mockResolvedValue([
      {
        id: 's-1',
        userId: 'staff-1',
        rescueId: 'rescue-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.org',
        title: 'Foster Lead',
        isVerified: true,
        addedAt: '2024-01-01',
      },
    ]);
  });

  it('renders pet and staff pickers populated from the rescue services', async () => {
    render(<FosterCoordination />);
    fireEvent.click(screen.getByRole('button', { name: 'New Placement' }));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Buddy/ })).toBeInTheDocument();
    });
    expect(screen.getByRole('option', { name: /Whiskers/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Ada Lovelace/ })).toBeInTheDocument();
  });

  it('creates a placement using the picker-selected pet and foster user', async () => {
    render(<FosterCoordination />);
    fireEvent.click(screen.getByRole('button', { name: 'New Placement' }));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Buddy/ })).toBeInTheDocument();
    });

    const petSelect = screen.getByRole('dialog').querySelectorAll('select')[0];
    const staffSelect = screen.getByRole('dialog').querySelectorAll('select')[1];
    const dateInput = screen.getByRole('dialog').querySelector('input[type="date"]');

    fireEvent.change(petSelect!, { target: { value: 'pet-1' } });
    fireEvent.change(staffSelect!, { target: { value: 'staff-1' } });
    fireEvent.change(dateInput!, { target: { value: '2026-05-20' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockedFoster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          petId: 'pet-1',
          fosterUserId: 'staff-1',
          rescueId: 'rescue-1',
        })
      );
    });
  });

  it('requires confirmation before ending a placement', async () => {
    mockedFoster.list.mockResolvedValueOnce([
      {
        placementId: 'pl-1',
        petId: 'pet-1',
        fosterUserId: 'staff-1',
        rescueId: 'rescue-1',
        startDate: '2026-01-01',
        endDate: null,
        status: 'active',
        notes: null,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]);

    render(<FosterCoordination />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'End placement' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'End placement' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'danger', title: 'End foster placement?' })
      );
    });
    await waitFor(() => {
      expect(mockedFoster.end).toHaveBeenCalledWith(
        'pl-1',
        expect.objectContaining({ outcome: 'return_to_rescue' })
      );
    });
  });

  it('does not call fosterService.end when confirmation is dismissed', async () => {
    confirmSpy.mockResolvedValueOnce(false);
    mockedFoster.list.mockResolvedValueOnce([
      {
        placementId: 'pl-1',
        petId: 'pet-1',
        fosterUserId: 'staff-1',
        rescueId: 'rescue-1',
        startDate: '2026-01-01',
        endDate: null,
        status: 'active',
        notes: null,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]);

    render(<FosterCoordination />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'End placement' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'End placement' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
    });
    expect(mockedFoster.end).not.toHaveBeenCalled();
  });
});
