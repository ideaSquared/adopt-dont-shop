import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock('@adopt-dont-shop/lib.api', () => ({
  apiService: { get: mockGet, post: mockPost },
}));

// Stub lib.components so the real SanctionBanner's fetch/acknowledge wiring is
// observable without dragging in sonner or vanilla-extract.
vi.mock('@adopt-dont-shop/lib.components', async () => {
  const React = await import('react');
  type Sanction = { id: string; reason: string };
  const SanctionBanner = ({
    fetchSanctions,
    acknowledgeSanction,
  }: {
    fetchSanctions: () => Promise<Sanction[]>;
    acknowledgeSanction: (id: string) => Promise<void>;
  }) => {
    const [sanctions, setSanctions] = React.useState<Sanction[]>([]);
    React.useEffect(() => {
      void fetchSanctions().then(setSanctions);
    }, [fetchSanctions]);
    return (
      <ul>
        {sanctions.map((sanction) => (
          <li key={sanction.id}>
            {sanction.reason}
            <button
              type="button"
              onClick={() => {
                acknowledgeSanction(sanction.id).catch(() => undefined);
              }}
            >
              Acknowledge {sanction.id}
            </button>
          </li>
        ))}
      </ul>
    );
  };
  return { SanctionBanner, toast: { success: mockToastSuccess, error: mockToastError } };
});

import { SanctionBannerHost } from './SanctionBannerHost';

describe('SanctionBannerHost', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue({ sanctions: [{ id: 's-1', reason: 'Be kind' }] });
    mockPost.mockResolvedValue(undefined);
  });

  it('shows the active sanctions fetched from the auth API', async () => {
    render(<SanctionBannerHost />);

    expect(await screen.findByText('Be kind')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/api/v1/auth/sanctions/active');
  });

  it('shows nothing when the response has no sanctions', async () => {
    mockGet.mockResolvedValue({});

    render(<SanctionBannerHost />);

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('acknowledges a sanction and confirms with a success toast', async () => {
    const user = userEvent.setup();
    render(<SanctionBannerHost />);

    await user.click(await screen.findByRole('button', { name: /acknowledge s-1/i }));

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Sanction acknowledged'));
    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/sanctions/s-1/acknowledge');
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('shows an error toast when acknowledging fails', async () => {
    mockPost.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    render(<SanctionBannerHost />);

    await user.click(await screen.findByRole('button', { name: /acknowledge s-1/i }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('Failed to acknowledge sanction')
    );
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });
});
