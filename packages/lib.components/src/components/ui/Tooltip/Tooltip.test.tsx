import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('renders the trigger child and keeps the tooltip hidden by default', () => {
    render(
      <Tooltip content='Helpful hint'>
        <button type='button'>Action</button>
      </Tooltip>
    );

    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows the content to keyboard users on focus and describes the trigger with it', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content='Helpful hint'>
        <button type='button'>Action</button>
      </Tooltip>
    );

    await user.tab();

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Helpful hint');
    expect(screen.getByRole('button', { name: 'Action' })).toHaveAccessibleDescription(
      'Helpful hint'
    );
  });

  it('hides the tooltip when Escape is pressed', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content='Helpful hint'>
        <button type='button'>Action</button>
      </Tooltip>
    );
    await user.tab();
    await screen.findByRole('tooltip');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('shows the content on hover', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content='Helpful hint'>
        <button type='button'>Action</button>
      </Tooltip>
    );

    await user.hover(screen.getByRole('button', { name: 'Action' }));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Helpful hint');
  });
});
