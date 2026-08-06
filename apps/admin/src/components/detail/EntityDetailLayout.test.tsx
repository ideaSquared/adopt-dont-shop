import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EntityDetailLayout } from './EntityDetailLayout';

describe('EntityDetailLayout', () => {
  it('always renders the list pane content', () => {
    render(
      <EntityDetailLayout list={<div>list content</div>} detailOpen={false} onBack={vi.fn()} />
    );

    expect(screen.getByText('list content')).toBeInTheDocument();
  });

  it('does not render the detail pane when no entity is selected', () => {
    render(
      <EntityDetailLayout
        list={<div>list content</div>}
        detail={<div>detail content</div>}
        detailOpen={false}
        onBack={vi.fn()}
      />
    );

    expect(screen.queryByText('detail content')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back to list' })).not.toBeInTheDocument();
  });

  it('renders the detail pane and a back control when an entity is selected', () => {
    render(
      <EntityDetailLayout
        list={<div>list content</div>}
        detail={<div>detail content</div>}
        detailOpen
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('detail content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to list' })).toBeInTheDocument();
  });

  it('invokes onBack when the back control is activated', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();

    render(
      <EntityDetailLayout
        list={<div>list content</div>}
        detail={<div>detail content</div>}
        detailOpen
        onBack={onBack}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Back to list' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('supports a custom back label', () => {
    render(
      <EntityDetailLayout
        list={<div>list content</div>}
        detail={<div>detail content</div>}
        detailOpen
        onBack={vi.fn()}
        backLabel='Back to users'
      />
    );

    expect(screen.getByRole('button', { name: 'Back to users' })).toBeInTheDocument();
  });
});
