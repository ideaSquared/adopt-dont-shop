/**
 * Behaviour tests for PetGrid empty state (ADS-646).
 *
 * Verifies that the empty state — shown when a rescue has no pets — makes
 * the CSV bulk import path discoverable alongside the "Add Your First Pet"
 * call to action.
 */

import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '../../test-utils/render';
import type { Pet } from '@adopt-dont-shop/lib.pets';
import PetGrid from './PetGrid';

// The grid only reads pet_id and what PetCard renders; keep the fixture to those fields.
const buildGridPet = (): Pet =>
  // Justified assertion: partial fixture, the render path reads only these fields.
  ({
    pet_id: 'pet-1',
    name: 'Buddy',
    type: 'dog',
    status: 'available',
    images: [],
  }) as unknown as Pet;

describe('PetGrid empty state (ADS-646)', () => {
  it('renders an "Import from CSV" button when onOpenCsvImport is provided', () => {
    renderWithProviders(
      <PetGrid
        pets={[]}
        onStatusChange={vi.fn()}
        onEditPet={vi.fn()}
        onDeletePet={() => Promise.resolve()}
        onOpenCsvImport={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /import from csv/i })).toBeInTheDocument();
  });

  it('does not render the CSV button when no handler is supplied (e.g. no rescue yet)', () => {
    renderWithProviders(
      <PetGrid
        pets={[]}
        onStatusChange={vi.fn()}
        onEditPet={vi.fn()}
        onDeletePet={() => Promise.resolve()}
      />
    );

    expect(screen.queryByRole('button', { name: /import from csv/i })).toBeNull();
  });

  it('exposes a link to the CSV import guide alongside the import button', () => {
    renderWithProviders(
      <PetGrid
        pets={[]}
        onStatusChange={vi.fn()}
        onEditPet={vi.fn()}
        onDeletePet={() => Promise.resolve()}
        onOpenCsvImport={vi.fn()}
      />
    );

    const link = screen.getByRole('link', { name: /csv import guide/i });
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/ideaSquared/adopt-dont-shop/blob/main/docs/operations/pet-csv-import.md'
    );
  });

  it('invokes onOpenCsvImport when the empty-state CSV button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenCsvImport = vi.fn();
    renderWithProviders(
      <PetGrid
        pets={[]}
        onStatusChange={vi.fn()}
        onEditPet={vi.fn()}
        onDeletePet={() => Promise.resolve()}
        onOpenCsvImport={onOpenCsvImport}
      />
    );

    await user.click(screen.getByRole('button', { name: /import from csv/i }));
    expect(onOpenCsvImport).toHaveBeenCalledTimes(1);
  });
});

describe('PetGrid pagination', () => {
  const renderPaged = (onPageChange: (page: number) => void, currentPage = 2) =>
    renderWithProviders(
      <PetGrid
        pets={[buildGridPet()]}
        onStatusChange={vi.fn()}
        onEditPet={vi.fn()}
        onDeletePet={() => Promise.resolve()}
        pagination={{
          currentPage,
          totalPages: 4,
          hasNext: currentPage < 4,
          hasPrev: currentPage > 1,
          onPageChange,
        }}
      />
    );

  it('marks the current page and labels the page controls', () => {
    renderPaged(vi.fn());

    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Page 3' })).not.toHaveAttribute('aria-current');
  });

  it('moves between pages with the previous, next and numbered controls', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderPaged(onPageChange);

    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await user.click(screen.getByRole('button', { name: 'Page 4' }));

    expect(onPageChange.mock.calls).toEqual([[1], [3], [4]]);
  });

  it('disables previous on the first page', () => {
    renderPaged(vi.fn(), 1);

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });
});
