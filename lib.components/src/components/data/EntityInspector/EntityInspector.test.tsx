import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { EntityInspector } from './EntityInspector';

const baseTabs = [
  { id: 'overview', label: 'Overview', content: <div>Overview body</div> },
  { id: 'edit', label: 'Edit', content: <div>Edit body</div> },
  { id: 'activity', label: 'Activity', content: <div>Activity body</div> },
];

describe('EntityInspector', () => {
  it('renders the header slot and every tab label', () => {
    render(
      <EntityInspector header={<h3>Jessica Wilson</h3>} tabs={baseTabs} data-testid='inspector' />
    );

    expect(screen.getByText('Jessica Wilson')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument();
  });

  it('shows the first tab body by default', () => {
    render(<EntityInspector header={<h3>X</h3>} tabs={baseTabs} />);

    expect(screen.getByText('Overview body')).toBeInTheDocument();
    expect(screen.queryByText('Edit body')).not.toBeInTheDocument();
    expect(screen.queryByText('Activity body')).not.toBeInTheDocument();
  });

  it('honours defaultTabId', () => {
    render(<EntityInspector header={<h3>X</h3>} tabs={baseTabs} defaultTabId='activity' />);

    expect(screen.getByText('Activity body')).toBeInTheDocument();
    expect(screen.queryByText('Overview body')).not.toBeInTheDocument();
  });

  it('falls back to the first tab when defaultTabId does not match any tab', () => {
    render(<EntityInspector header={<h3>X</h3>} tabs={baseTabs} defaultTabId='nope' />);

    expect(screen.getByText('Overview body')).toBeInTheDocument();
  });

  it('switches the body when a tab is clicked', async () => {
    const user = userEvent.setup();
    render(<EntityInspector header={<h3>X</h3>} tabs={baseTabs} />);

    await user.click(screen.getByRole('tab', { name: 'Edit' }));

    expect(screen.getByText('Edit body')).toBeInTheDocument();
    expect(screen.queryByText('Overview body')).not.toBeInTheDocument();
  });

  it('marks the active tab as aria-selected', async () => {
    const user = userEvent.setup();
    render(<EntityInspector header={<h3>X</h3>} tabs={baseTabs} />);

    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: 'Activity' }));

    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Activity' })).toHaveAttribute('aria-selected', 'true');
  });

  it('renders a close button when onClose is provided and calls it', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<EntityInspector header={<h3>X</h3>} tabs={baseTabs} onClose={onClose} />);

    const close = screen.getByRole('button', { name: 'Close inspector' });
    await user.click(close);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('omits the close button when onClose is not provided', () => {
    render(<EntityInspector header={<h3>X</h3>} tabs={baseTabs} />);
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('resets the active tab when resetTabsOnKeyChange changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <EntityInspector header={<h3>X</h3>} tabs={baseTabs} resetTabsOnKeyChange='user-1' />
    );

    await user.click(screen.getByRole('tab', { name: 'Activity' }));
    expect(screen.getByText('Activity body')).toBeInTheDocument();

    rerender(<EntityInspector header={<h3>X</h3>} tabs={baseTabs} resetTabsOnKeyChange='user-2' />);

    expect(screen.getByText('Overview body')).toBeInTheDocument();
  });

  it('handles an empty tab list without crashing', () => {
    render(<EntityInspector header={<h3>X</h3>} tabs={[]} data-testid='inspector' />);
    expect(screen.getByTestId('inspector')).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });
});
