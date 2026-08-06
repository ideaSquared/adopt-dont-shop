import React from 'react';
import { describe, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// SelectInput (Radix, portal-based) and CheckboxInput (visually-hidden input
// behind a role="button" wrapper) are stubbed with plain, label-associated
// controls so the composer's behaviour can be exercised without portal/pointer
// plumbing. FormField, Input and TextArea render real accessible DOM.
vi.mock('@adopt-dont-shop/lib.components', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@adopt-dont-shop/lib.components');
  return {
    ...actual,
    SelectInput: ({
      label,
      value,
      onChange,
      options,
    }: {
      label: string;
      value: string;
      onChange: (v: string) => void;
      options: { value: string; label: string }[];
    }) =>
      React.createElement(
        'label',
        null,
        label,
        React.createElement(
          'select',
          {
            'aria-label': label,
            value,
            onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value),
          },
          options.map(o => React.createElement('option', { key: o.value, value: o.value }, o.label))
        )
      ),
    CheckboxInput: ({
      label,
      checked,
      onChange,
    }: {
      label: string;
      checked: boolean;
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    }) =>
      React.createElement('input', {
        type: 'checkbox',
        'aria-label': label,
        checked,
        onChange,
      }),
  };
});

vi.mock('../components/ui', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  PageHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('header', null, children),
  HeaderLeft: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  Card: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  CardHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  CardTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('h2', null, children),
  CardContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

const mockSendBroadcast = vi.fn();
const mockPreviewBroadcast = vi.fn();
vi.mock('../services/broadcastService', () => ({
  sendBroadcast: (...args: unknown[]) => mockSendBroadcast(...args),
  previewBroadcastAudience: (...args: unknown[]) => mockPreviewBroadcast(...args),
}));

import BroadcastNotifications from './BroadcastNotifications';

describe('BroadcastNotifications page', () => {
  beforeEach(() => {
    mockSendBroadcast.mockReset();
    mockPreviewBroadcast.mockReset();
  });

  it('shows inline validation errors and does not preview when title and body are empty', async () => {
    render(<BroadcastNotifications />);

    fireEvent.click(screen.getByRole('button', { name: /preview & send/i }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Body is required')).toBeInTheDocument();
    expect(mockPreviewBroadcast).not.toHaveBeenCalled();
  });

  it('requires at least one channel to be selected', async () => {
    render(<BroadcastNotifications />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Hello' } });
    fireEvent.change(screen.getByLabelText('Body'), { target: { value: 'Body text' } });
    // The default in_app channel is checked — unchecking it leaves no channels.
    fireEvent.click(screen.getByRole('checkbox', { name: 'In-app' }));

    fireEvent.click(screen.getByRole('button', { name: /preview & send/i }));

    expect(await screen.findByText('Select at least one channel')).toBeInTheDocument();
    expect(mockPreviewBroadcast).not.toHaveBeenCalled();
  });

  it('clears a field error once the user edits the field', async () => {
    render(<BroadcastNotifications />);

    fireEvent.click(screen.getByRole('button', { name: /preview & send/i }));
    expect(await screen.findByText('Title is required')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Hi' } });

    await waitFor(() => {
      expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
    });
  });

  it('previews the audience count, then sends with an idempotency key', async () => {
    mockPreviewBroadcast.mockResolvedValue(123);
    mockSendBroadcast.mockResolvedValue({
      audience: 'all',
      targetCount: 123,
      deliveredInApp: 123,
      skippedByPrefs: 0,
      skippedByDnd: 0,
      channels: ['in_app'],
    });

    render(<BroadcastNotifications />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Hello' } });
    fireEvent.change(screen.getByLabelText('Body'), { target: { value: 'Body text' } });

    fireEvent.click(screen.getByRole('button', { name: /preview & send/i }));

    await waitFor(() => {
      expect(mockPreviewBroadcast).toHaveBeenCalledWith('all');
    });
    expect(await screen.findByText(/123 users/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /send broadcast/i }));

    await waitFor(() => {
      expect(mockSendBroadcast).toHaveBeenCalledTimes(1);
    });

    const args = mockSendBroadcast.mock.calls[0][0];
    expect(args.audience).toBe('all');
    expect(args.title).toBe('Hello');
    expect(args.body).toBe('Body text');
    expect(args.channels).toEqual(['in_app']);
    expect(typeof args.idempotencyKey).toBe('string');
    expect(args.idempotencyKey.length).toBeGreaterThan(0);
  });

  it('surfaces an error message when the broadcast fails', async () => {
    mockPreviewBroadcast.mockResolvedValue(5);
    mockSendBroadcast.mockRejectedValue(new Error('Boom'));

    render(<BroadcastNotifications />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText('Body'), { target: { value: 'y' } });
    fireEvent.click(screen.getByRole('button', { name: /preview & send/i }));
    await waitFor(() => expect(mockPreviewBroadcast).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /send broadcast/i }));

    expect(await screen.findByText('Boom')).toBeInTheDocument();
  });
});
