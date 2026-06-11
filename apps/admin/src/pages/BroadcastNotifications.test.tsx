import React from 'react';
import { describe, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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
    TextInput: ({
      label,
      value,
      onChange,
    }: {
      label: string;
      value: string;
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    }) =>
      React.createElement(
        'label',
        null,
        label,
        React.createElement('input', { 'aria-label': label, value, onChange })
      ),
    TextArea: ({
      label,
      value,
      onChange,
    }: {
      label: string;
      value: string;
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    }) =>
      React.createElement(
        'label',
        null,
        label,
        React.createElement('textarea', { 'aria-label': label, value, onChange })
      ),
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

  it('disables the preview button until title and body are filled', () => {
    render(<BroadcastNotifications />);
    expect(screen.getByRole('button', { name: /preview & send/i })).toBeDisabled();
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
