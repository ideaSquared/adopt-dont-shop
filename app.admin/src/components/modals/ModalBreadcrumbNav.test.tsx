import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { ModalBreadcrumbNav } from './ModalBreadcrumbNav';

describe('ModalBreadcrumbNav', () => {
  it('renders all segment labels in order', () => {
    render(
      <ModalBreadcrumbNav
        segments={[
          { label: 'Tickets', to: '/support' },
          { label: 'Open', to: '/support?status=open' },
          { label: 'Ticket #1234' },
        ]}
      />
    );

    expect(screen.getByText('Tickets')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Ticket #1234')).toBeInTheDocument();
  });

  it('renders non-last segments with a `to` as links to that path', () => {
    render(
      <ModalBreadcrumbNav
        segments={[
          { label: 'Tickets', to: '/support' },
          { label: 'Open', to: '/support?status=open' },
          { label: 'Ticket #1234' },
        ]}
      />
    );

    const ticketsLink = screen.getByRole('link', { name: 'Tickets' });
    expect(ticketsLink).toHaveAttribute('href', '/support');

    const openLink = screen.getByRole('link', { name: 'Open' });
    expect(openLink).toHaveAttribute('href', '/support?status=open');
  });

  it('renders the last segment as plain text (not a link) and marks it aria-current="page"', () => {
    render(
      <ModalBreadcrumbNav
        segments={[{ label: 'Tickets', to: '/support' }, { label: 'Ticket #1234' }]}
      />
    );

    expect(screen.queryByRole('link', { name: 'Ticket #1234' })).toBeNull();
    const current = screen.getByText('Ticket #1234');
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('does not render prev/next when siblingIds are not provided', () => {
    render(<ModalBreadcrumbNav segments={[{ label: 'Tickets' }, { label: 'Ticket #1' }]} />);

    expect(screen.queryByRole('button', { name: /previous item/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /next item/i })).toBeNull();
  });

  it('does not render prev/next when only a single sibling is provided', () => {
    render(
      <ModalBreadcrumbNav
        segments={[{ label: 'Tickets' }, { label: 'Ticket #1' }]}
        siblingIds={['only-id']}
        currentId='only-id'
        onNavigate={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /previous item/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /next item/i })).toBeNull();
  });

  it('invokes onNavigate with the previous sibling id when prev is clicked', async () => {
    const onNavigate = vi.fn();
    render(
      <ModalBreadcrumbNav
        segments={[{ label: 'Tickets' }, { label: 'Ticket #2' }]}
        siblingIds={['t1', 't2', 't3']}
        currentId='t2'
        onNavigate={onNavigate}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /previous item/i }));
    expect(onNavigate).toHaveBeenCalledWith('t1');
  });

  it('invokes onNavigate with the next sibling id when next is clicked', async () => {
    const onNavigate = vi.fn();
    render(
      <ModalBreadcrumbNav
        segments={[{ label: 'Tickets' }, { label: 'Ticket #2' }]}
        siblingIds={['t1', 't2', 't3']}
        currentId='t2'
        onNavigate={onNavigate}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /next item/i }));
    expect(onNavigate).toHaveBeenCalledWith('t3');
  });

  it('disables prev when on the first sibling', () => {
    render(
      <ModalBreadcrumbNav
        segments={[{ label: 'Tickets' }, { label: 'Ticket #1' }]}
        siblingIds={['t1', 't2', 't3']}
        currentId='t1'
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /previous item/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next item/i })).not.toBeDisabled();
  });

  it('disables next when on the last sibling', () => {
    render(
      <ModalBreadcrumbNav
        segments={[{ label: 'Tickets' }, { label: 'Ticket #3' }]}
        siblingIds={['t1', 't2', 't3']}
        currentId='t3'
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /next item/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /previous item/i })).not.toBeDisabled();
  });
});
