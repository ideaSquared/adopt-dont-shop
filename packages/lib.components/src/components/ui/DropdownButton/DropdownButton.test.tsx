import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DropdownButton } from './DropdownButton';

describe('DropdownButton', () => {
  it('renders a trigger button with the label', () => {
    render(<DropdownButton triggerLabel='Actions' items={[]} />);

    expect(screen.getByRole('button', { name: 'Actions' })).toBeInTheDocument();
  });

  it('applies a custom className to the trigger', () => {
    render(<DropdownButton triggerLabel='Actions' items={[]} className='custom-dropdown' />);

    expect(screen.getByRole('button', { name: 'Actions' })).toHaveClass('custom-dropdown');
  });

  it('lists items in order when opened, with links for items that have a destination', async () => {
    const user = userEvent.setup();
    render(
      <DropdownButton
        triggerLabel='Actions'
        items={[
          { label: 'Edit', onClick: vi.fn() },
          { label: 'View details', to: '/details' },
          { label: 'Delete', onClick: vi.fn() },
        ]}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Actions' }));

    const items = await screen.findAllByRole('menuitem');
    expect(items.map(item => item.textContent)).toEqual(['Edit', 'View details', 'Delete']);
    expect(screen.getByRole('menuitem', { name: 'View details' })).toHaveAttribute(
      'href',
      '/details'
    );
  });

  it('calls an action handler exactly once per selection', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<DropdownButton triggerLabel='Actions' items={[{ label: 'Edit', onClick: onEdit }]} />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));

    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('is focusable with the keyboard and disabled when asked', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DropdownButton triggerLabel='Actions' items={[]} />);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Actions' })).toHaveFocus();

    rerender(<DropdownButton triggerLabel='Actions' items={[]} disabled />);
    expect(screen.getByRole('button', { name: 'Actions' })).toBeDisabled();
  });
});
