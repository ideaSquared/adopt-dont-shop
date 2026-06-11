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
import PetGrid from './PetGrid';

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
