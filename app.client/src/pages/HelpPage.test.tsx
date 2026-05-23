import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils/render';
import userEvent from '@testing-library/user-event';

const listHelpArticlesMock = vi.fn();

vi.mock('@/services/cmsService', () => ({
  cmsPublicService: {
    listHelpArticles: (...args: unknown[]) => listHelpArticlesMock(...args),
  },
}));

import { HelpPage } from './HelpPage';

describe('HelpPage error handling', () => {
  beforeEach(() => {
    listHelpArticlesMock.mockReset();
  });

  it('renders an error message with a retry button when the CMS request fails', async () => {
    listHelpArticlesMock.mockRejectedValueOnce(new Error('boom'));

    render(<HelpPage />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/couldn’t load help articles/i);
    expect(
      screen.queryByText(/no help articles yet/i),
      'must not render the empty state on an outage'
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('retries the CMS request when the user clicks Try Again', async () => {
    const user = userEvent.setup();
    listHelpArticlesMock
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ content: [], pagination: { page: 1, limit: 20, total: 0 } });

    render(<HelpPage />);

    const retry = await screen.findByRole('button', { name: /try again/i });
    await user.click(retry);

    await waitFor(() => {
      expect(listHelpArticlesMock).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText(/no help articles yet/i)).toBeInTheDocument();
  });
});
