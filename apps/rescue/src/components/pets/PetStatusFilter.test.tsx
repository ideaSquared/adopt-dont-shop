import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../test-utils';
import PetStatusFilter from './PetStatusFilter';

describe('PetStatusFilter', () => {
  const renderFilter = () =>
    renderWithProviders(
      <PetStatusFilter
        activeStatus="available"
        statusCounts={{ available: 1, pending: 0, adopted: 1 }}
        onStatusChange={() => undefined}
      />
    );

  it('names each button after its visible label and count (WCAG 2.5.3)', () => {
    renderFilter();

    expect(screen.getByRole('button', { name: 'All Pets 2 pets' })).toHaveTextContent('All Pets 2');
    expect(screen.getByRole('button', { name: 'Available 1 pets' })).toHaveTextContent(
      'Available 1'
    );
    expect(screen.getByRole('button', { name: 'Pending 0 pets' })).toHaveTextContent('Pending 0');
  });

  it('still reports the active status as pressed', () => {
    renderFilter();

    expect(screen.getByRole('button', { name: /^Available/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
