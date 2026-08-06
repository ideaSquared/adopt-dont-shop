import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { SearchToolbar } from './SearchToolbar';

const renderToolbar = (component: React.ReactElement) => render(component);

describe('SearchToolbar', () => {
  it('renders a search landmark container with the given data-testid', () => {
    renderToolbar(<SearchToolbar searchValue='' onSearchChange={vi.fn()} data-testid='toolbar' />);

    const container = screen.getByTestId('toolbar');
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute('role', 'search');
  });

  it('gives the search field an accessible label', () => {
    renderToolbar(
      <SearchToolbar searchValue='' onSearchChange={vi.fn()} searchLabel='Search pets' />
    );

    expect(screen.getByLabelText('Search pets')).toBeInTheDocument();
  });

  it('calls onSearchChange with the typed value', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();

    renderToolbar(
      <SearchToolbar searchValue='' onSearchChange={onSearchChange} searchLabel='Search' />
    );

    await user.type(screen.getByLabelText('Search'), 'd');

    expect(onSearchChange).toHaveBeenCalledWith('d');
  });

  it('renders a pluralised result count as a polite live region', () => {
    renderToolbar(
      <SearchToolbar
        searchValue=''
        onSearchChange={vi.fn()}
        resultCount={3}
        data-testid='toolbar'
      />
    );

    const summary = screen.getByText('3 results');
    expect(summary).toBeInTheDocument();
    expect(summary).toHaveAttribute('aria-live', 'polite');
  });

  it('renders the singular noun when the count is one', () => {
    renderToolbar(<SearchToolbar searchValue='' onSearchChange={vi.fn()} resultCount={1} />);

    expect(screen.getByText('1 result')).toBeInTheDocument();
  });

  it('renders a count of zero', () => {
    renderToolbar(<SearchToolbar searchValue='' onSearchChange={vi.fn()} resultCount={0} />);

    expect(screen.getByText('0 results')).toBeInTheDocument();
  });

  it('supports a custom result noun', () => {
    renderToolbar(
      <SearchToolbar
        searchValue=''
        onSearchChange={vi.fn()}
        resultCount={2}
        resultNoun='application'
      />
    );

    expect(screen.getByText('2 applications')).toBeInTheDocument();
  });

  it('renders active-filter chips', () => {
    renderToolbar(
      <SearchToolbar
        searchValue=''
        onSearchChange={vi.fn()}
        activeFilters={[{ name: 'species', label: 'Species', value: 'Dog' }]}
      />
    );

    expect(screen.getByText('Species: Dog')).toBeInTheDocument();
  });

  it('calls onRemoveFilter with the filter name when a chip remove button is clicked', async () => {
    const user = userEvent.setup();
    const onRemoveFilter = vi.fn();

    renderToolbar(
      <SearchToolbar
        searchValue=''
        onSearchChange={vi.fn()}
        activeFilters={[{ name: 'species', label: 'Species', value: 'Dog' }]}
        onRemoveFilter={onRemoveFilter}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Remove filter Species: Dog' }));

    expect(onRemoveFilter).toHaveBeenCalledWith('species');
  });

  it('removes a filter chip via the keyboard', async () => {
    const user = userEvent.setup();
    const onRemoveFilter = vi.fn();

    renderToolbar(
      <SearchToolbar
        searchValue=''
        onSearchChange={vi.fn()}
        activeFilters={[{ name: 'status', label: 'Status', value: 'Available' }]}
        onRemoveFilter={onRemoveFilter}
      />
    );

    const removeButton = screen.getByRole('button', { name: 'Remove filter Status: Available' });
    removeButton.focus();
    await user.keyboard('{Enter}');

    expect(onRemoveFilter).toHaveBeenCalledWith('status');
  });

  it('renders filter inputs from the filter config', () => {
    renderToolbar(
      <SearchToolbar
        searchValue=''
        onSearchChange={vi.fn()}
        filterConfig={[{ name: 'status', label: 'Status', type: 'text' }]}
        filters={{ status: '' }}
        onFilterChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });

  it('renders without filters or chips when none are provided', () => {
    renderToolbar(<SearchToolbar searchValue='' onSearchChange={vi.fn()} data-testid='toolbar' />);

    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies a custom className to the container', () => {
    renderToolbar(
      <SearchToolbar
        searchValue=''
        onSearchChange={vi.fn()}
        className='custom-toolbar'
        data-testid='toolbar'
      />
    );

    expect(screen.getByTestId('toolbar')).toHaveClass('custom-toolbar');
  });
});
