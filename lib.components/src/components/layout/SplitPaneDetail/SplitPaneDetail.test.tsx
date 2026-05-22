import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SplitPaneDetail } from './SplitPaneDetail';

type Pet = { petId: string; name: string };

const PETS: ReadonlyArray<Pet> = [
  { petId: 'p1', name: 'Biscuit' },
  { petId: 'p2', name: 'Luna' },
  { petId: 'p3', name: 'Mochi' },
];

const renderListItem = (pet: Pet) => <span>{pet.name}</span>;
const renderDetail = (pet: Pet) => <div data-testid='detail-body'>Detail for {pet.name}</div>;

describe('SplitPaneDetail', () => {
  it('renders every item from the list', () => {
    render(
      <SplitPaneDetail
        items={PETS}
        getItemId={pet => pet.petId}
        selectedId={null}
        onSelect={() => {}}
        renderListItem={renderListItem}
        renderDetail={renderDetail}
        data-testid='pets'
      />
    );

    expect(screen.getByText('Biscuit')).toBeInTheDocument();
    expect(screen.getByText('Luna')).toBeInTheDocument();
    expect(screen.getByText('Mochi')).toBeInTheDocument();
  });

  it('shows the empty-detail placeholder when nothing is selected', () => {
    render(
      <SplitPaneDetail
        items={PETS}
        getItemId={pet => pet.petId}
        selectedId={null}
        onSelect={() => {}}
        renderListItem={renderListItem}
        renderDetail={renderDetail}
        emptyDetail={<p>Pick a pet to begin.</p>}
        data-testid='pets'
      />
    );

    expect(screen.getByText('Pick a pet to begin.')).toBeInTheDocument();
    expect(screen.queryByTestId('detail-body')).not.toBeInTheDocument();
  });

  it('falls back to a default empty-detail message when none is provided', () => {
    render(
      <SplitPaneDetail
        items={PETS}
        getItemId={pet => pet.petId}
        selectedId={null}
        onSelect={() => {}}
        renderListItem={renderListItem}
        renderDetail={renderDetail}
      />
    );

    expect(screen.getByText('Select an item to view details.')).toBeInTheDocument();
  });

  it('renders the detail for the selected item', () => {
    render(
      <SplitPaneDetail
        items={PETS}
        getItemId={pet => pet.petId}
        selectedId='p2'
        onSelect={() => {}}
        renderListItem={renderListItem}
        renderDetail={renderDetail}
      />
    );

    expect(screen.getByText('Detail for Luna')).toBeInTheDocument();
  });

  it('marks the selected row with aria-current', () => {
    render(
      <SplitPaneDetail
        items={PETS}
        getItemId={pet => pet.petId}
        selectedId='p2'
        onSelect={() => {}}
        renderListItem={renderListItem}
        renderDetail={renderDetail}
      />
    );

    const lunaButton = screen.getByRole('button', { name: 'Luna' });
    const biscuitButton = screen.getByRole('button', { name: 'Biscuit' });

    expect(lunaButton).toHaveAttribute('aria-current', 'true');
    expect(biscuitButton).not.toHaveAttribute('aria-current');
  });

  it('calls onSelect with the row id when a list item is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <SplitPaneDetail
        items={PETS}
        getItemId={pet => pet.petId}
        selectedId={null}
        onSelect={onSelect}
        renderListItem={renderListItem}
        renderDetail={renderDetail}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Mochi' }));

    expect(onSelect).toHaveBeenCalledWith('p3');
  });

  it('passes isSelected to the list-item renderer so callers can style selection', () => {
    render(
      <SplitPaneDetail
        items={PETS}
        getItemId={pet => pet.petId}
        selectedId='p1'
        onSelect={() => {}}
        renderListItem={(pet, { isSelected }) => (
          <span>
            {pet.name} {isSelected ? '(selected)' : ''}
          </span>
        )}
        renderDetail={renderDetail}
      />
    );

    expect(screen.getByText(/Biscuit \(selected\)/)).toBeInTheDocument();
    expect(screen.getByText('Luna')).toBeInTheDocument();
  });

  it('shows the empty-list slot when there are no items', () => {
    render(
      <SplitPaneDetail
        items={[]}
        getItemId={(pet: Pet) => pet.petId}
        selectedId={null}
        onSelect={() => {}}
        renderListItem={renderListItem}
        renderDetail={renderDetail}
        emptyList={<p>No pets match your filters.</p>}
      />
    );

    expect(screen.getByText('No pets match your filters.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('treats a selectedId that does not match any item as no selection', () => {
    render(
      <SplitPaneDetail
        items={PETS}
        getItemId={pet => pet.petId}
        selectedId='missing'
        onSelect={() => {}}
        renderListItem={renderListItem}
        renderDetail={renderDetail}
        emptyDetail={<p>nothing selected</p>}
      />
    );

    expect(screen.getByText('nothing selected')).toBeInTheDocument();
    expect(screen.queryByTestId('detail-body')).not.toBeInTheDocument();
  });

  it('clears the selection when the back-to-list control is activated', async () => {
    const user = userEvent.setup();

    const Harness = () => {
      const [selectedId, setSelectedId] = useState<string | null>('p2');
      return (
        <SplitPaneDetail
          items={PETS}
          getItemId={pet => pet.petId}
          selectedId={selectedId}
          onSelect={setSelectedId}
          renderListItem={renderListItem}
          renderDetail={renderDetail}
          backLabel='Back to list'
        />
      );
    };

    render(<Harness />);

    expect(screen.getByText('Detail for Luna')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to list' }));

    expect(screen.queryByText('Detail for Luna')).not.toBeInTheDocument();
    expect(screen.getByText('Select an item to view details.')).toBeInTheDocument();
  });

  it('updates the detail pane as a controlled selection changes', () => {
    const { rerender } = render(
      <SplitPaneDetail
        items={PETS}
        getItemId={pet => pet.petId}
        selectedId='p1'
        onSelect={() => {}}
        renderListItem={renderListItem}
        renderDetail={renderDetail}
      />
    );

    expect(screen.getByText('Detail for Biscuit')).toBeInTheDocument();

    rerender(
      <SplitPaneDetail
        items={PETS}
        getItemId={pet => pet.petId}
        selectedId='p3'
        onSelect={() => {}}
        renderListItem={renderListItem}
        renderDetail={renderDetail}
      />
    );

    expect(screen.queryByText('Detail for Biscuit')).not.toBeInTheDocument();
    expect(screen.getByText('Detail for Mochi')).toBeInTheDocument();
  });
});
