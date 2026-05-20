/**
 * ADS-583: rescue staff need a way to mark conversations as resolved.
 *
 * Behaviour under test:
 * - The Active tab is the default view.
 * - When the active conversation is loaded and the viewer has chat-management
 *   permission, a "Mark resolved" action appears.
 * - Clicking "Mark resolved" opens a useConfirm modal; confirming calls
 *   updateConversationStatus with 'archived'.
 * - Switching to Resolved shows the resolved conversation; switching back
 *   to Active hides it.
 * - Filter selection persists in localStorage across mounts.
 */
import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Conversation } from '@adopt-dont-shop/lib.chat';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
};

vi.mock('@adopt-dont-shop/lib.components', async () => {
  type Resolver = (v: boolean) => void;
  const useConfirm = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [opts, setOpts] = useState<ConfirmOptions>({ message: '' });
    const [resolver, setResolver] = useState<{ resolve: Resolver } | null>(null);

    const confirm = (o: ConfirmOptions) => {
      setOpts(o);
      setIsOpen(true);
      return new Promise<boolean>(resolve => {
        setResolver({ resolve });
      });
    };
    const onClose = () => {
      setIsOpen(false);
      resolver?.resolve(false);
      setResolver(null);
    };
    const onConfirm = () => {
      setIsOpen(false);
      resolver?.resolve(true);
      setResolver(null);
    };
    return {
      confirm,
      confirmProps: { isOpen, onClose, onConfirm, ...opts },
    };
  };

  const ConfirmDialog = (props: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    'data-testid'?: string;
  }) => {
    if (!props.isOpen) {
      return null;
    }
    return (
      <div role="dialog" data-testid={props['data-testid']}>
        <h2>{props.title}</h2>
        <p>{props.message}</p>
        <button onClick={props.onClose}>{props.cancelText ?? 'Cancel'}</button>
        <button onClick={props.onConfirm}>{props.confirmText ?? 'Confirm'}</button>
      </div>
    );
  };

  const Button = (props: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={props.type ?? 'button'} onClick={props.onClick} disabled={props.disabled}>
      {props.children}
    </button>
  );

  const toast = { success: vi.fn(), error: vi.fn() };

  return { useConfirm, ConfirmDialog, Button, toast };
});

// lib.chat renders the conversation rows and the chat window from the
// useChat context. For these tests we replace those with light test doubles
// so we can drive the page from the conversations + active conversation
// state, without spinning up a real socket or provider.
const mockedUseChat = vi.fn();
vi.mock('@adopt-dont-shop/lib.chat', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.chat')>(
    '@adopt-dont-shop/lib.chat'
  );

  const ConversationList = ({ filter }: { filter?: 'active' | 'resolved' | 'all' }) => {
    const ctx = mockedUseChat();
    const visible = (ctx.conversations as Conversation[]).filter(c => {
      if (filter === 'resolved') {
        return c.status === 'archived' || c.status === 'closed';
      }
      if (filter === 'active') {
        return !c.status || c.status === 'active';
      }
      return true;
    });
    return (
      <ul data-testid="conversation-list">
        {visible.map(c => (
          <li key={c.id} data-testid={`conv-${c.id}`}>
            {c.title ?? c.id}
          </li>
        ))}
      </ul>
    );
  };
  const ChatWindow = () => {
    const ctx = mockedUseChat();
    return <div data-testid="chat-window">{ctx.activeConversation?.id ?? 'none'}</div>;
  };
  return { ...actual, ConversationList, ChatWindow };
});

// PermissionsContext is the gate. We replace it inline so we can grant or
// revoke CHAT_UPDATE per test.
const mockedHasPermission = vi.fn();
vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ hasPermission: mockedHasPermission }),
}));

vi.mock('@/contexts/ChatContext', () => ({
  useChat: () => mockedUseChat(),
}));

import Communication from './Communication';

type BuildOptions = {
  conversations?: Conversation[];
  activeConversation?: Conversation | null;
  hasPermission?: boolean;
  updateConversationStatus?: ReturnType<typeof vi.fn>;
};

const baseConversation = (overrides: Partial<Conversation>): Conversation => ({
  id: 'conv-1',
  participants: [],
  unreadCount: 0,
  updatedAt: '2026-05-01T10:00:00Z',
  createdAt: '2026-05-01T10:00:00Z',
  isActive: true,
  status: 'active',
  ...overrides,
});

const setupHooks = (opts: BuildOptions = {}) => {
  const updateConversationStatus =
    opts.updateConversationStatus ?? vi.fn().mockResolvedValue(undefined);
  mockedHasPermission.mockReset();
  mockedHasPermission.mockImplementation(() => opts.hasPermission ?? true);
  mockedUseChat.mockReset();
  mockedUseChat.mockReturnValue({
    conversations: opts.conversations ?? [],
    activeConversation: opts.activeConversation ?? null,
    updateConversationStatus,
  });
  return { updateConversationStatus };
};

const renderPage = () => render(<Communication />);

describe('Communication page - ADS-583 mark resolved', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to the Active filter on first mount', () => {
    setupHooks({
      conversations: [
        baseConversation({ id: 'a', title: 'Active thread', status: 'active' }),
        baseConversation({ id: 'b', title: 'Resolved thread', status: 'archived' }),
      ],
    });

    renderPage();

    const activeTab = screen.getByRole('tab', { name: /^active$/i });
    expect(activeTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('conv-a')).toBeInTheDocument();
    expect(screen.queryByTestId('conv-b')).not.toBeInTheDocument();
  });

  it('moves a conversation to Resolved after the user confirms "Mark resolved"', async () => {
    const active = baseConversation({ id: 'a', title: 'Open thread', status: 'active' });
    const { updateConversationStatus } = setupHooks({
      conversations: [active],
      activeConversation: active,
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /mark resolved/i }));
    const dialog = await screen.findByTestId('mark-resolved-confirm');
    expect(dialog).toHaveTextContent(/resolved/i);

    // Confirm by clicking the dialog's confirm button.
    const dialogButtons = Array.from(dialog.querySelectorAll('button'));
    const confirmBtn = dialogButtons.find(b => b.textContent === 'Mark resolved');
    expect(confirmBtn).toBeDefined();
    fireEvent.click(confirmBtn!);

    await waitFor(() => {
      expect(updateConversationStatus).toHaveBeenCalledWith('a', 'archived');
    });
  });

  it('does not call updateConversationStatus when the confirmation is cancelled', async () => {
    const active = baseConversation({ id: 'a', title: 'Open thread', status: 'active' });
    const { updateConversationStatus } = setupHooks({
      conversations: [active],
      activeConversation: active,
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /mark resolved/i }));
    const dialog = await screen.findByTestId('mark-resolved-confirm');
    const cancelBtn = Array.from(dialog.querySelectorAll('button')).find(
      b => b.textContent === 'Cancel'
    );
    fireEvent.click(cancelBtn!);

    await new Promise(r => setTimeout(r, 0));
    expect(updateConversationStatus).not.toHaveBeenCalled();
  });

  it('shows Reopen instead of Mark resolved when the active conversation is resolved', () => {
    const resolved = baseConversation({ id: 'a', title: 'Done thread', status: 'archived' });
    setupHooks({
      conversations: [resolved],
      activeConversation: resolved,
    });

    renderPage();

    expect(screen.queryByRole('button', { name: /mark resolved/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reopen/i })).toBeInTheDocument();
  });

  it('reopens a resolved conversation when Reopen is clicked', async () => {
    const resolved = baseConversation({ id: 'a', title: 'Done thread', status: 'archived' });
    const { updateConversationStatus } = setupHooks({
      conversations: [resolved],
      activeConversation: resolved,
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /reopen/i }));

    await waitFor(() => {
      expect(updateConversationStatus).toHaveBeenCalledWith('a', 'active');
    });
  });

  it('hides the resolve/reopen actions when the user lacks chat-management permission', () => {
    const active = baseConversation({ id: 'a', status: 'active' });
    setupHooks({
      conversations: [active],
      activeConversation: active,
      hasPermission: false,
    });

    renderPage();

    expect(screen.queryByRole('button', { name: /mark resolved/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reopen/i })).not.toBeInTheDocument();
  });

  it('switches the visible list when the user toggles the Resolved filter', () => {
    setupHooks({
      conversations: [
        baseConversation({ id: 'a', title: 'Open thread', status: 'active' }),
        baseConversation({ id: 'b', title: 'Done thread', status: 'archived' }),
      ],
    });

    renderPage();

    fireEvent.click(screen.getByRole('tab', { name: /^resolved$/i }));

    expect(screen.queryByTestId('conv-a')).not.toBeInTheDocument();
    expect(screen.getByTestId('conv-b')).toBeInTheDocument();
  });

  it('persists the selected filter across re-mounts via localStorage', () => {
    setupHooks({
      conversations: [
        baseConversation({ id: 'a', title: 'Open thread', status: 'active' }),
        baseConversation({ id: 'b', title: 'Done thread', status: 'archived' }),
      ],
    });

    const { unmount } = renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /^resolved$/i }));
    unmount();

    renderPage();
    expect(screen.getByRole('tab', { name: /^resolved$/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.queryByTestId('conv-a')).not.toBeInTheDocument();
    expect(screen.getByTestId('conv-b')).toBeInTheDocument();
  });
});
