/**
 * Behaviour tests for the application's answers panel in the rescue's review
 * modal. Answers arrive keyed by question (`hours_alone`, `why_adopt`, …) and
 * are shown under the rescue's own wording for each question.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getApplicationQuestions } from '../../../services/applicationQuestionsService';
import { ApplicationDetails } from './ApplicationDetails';

vi.mock('../../../services/applicationQuestionsService', () => ({
  getApplicationQuestions: vi.fn(),
}));

const renderDetails = (ui: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe('ApplicationDetails', () => {
  beforeEach(() => {
    vi.mocked(getApplicationQuestions).mockReset();
  });

  it("shows each answer under the rescue's question wording", async () => {
    vi.mocked(getApplicationQuestions).mockResolvedValue([
      {
        questionKey: 'hours_alone',
        category: 'lifestyle_compatibility',
        questionText: 'How many hours would the pet be alone each day?',
        questionType: 'text',
        displayOrder: 1,
      },
    ]);

    renderDetails(<ApplicationDetails rescueId="rsc-1" answers={{ hours_alone: '2–4 hours' }} />);

    expect(
      await screen.findByText('How many hours would the pet be alone each day?')
    ).toBeInTheDocument();
    expect(screen.getByText('2–4 hours')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lifestyle Compatibility' })).toBeInTheDocument();
    expect(getApplicationQuestions).toHaveBeenCalledWith('rsc-1');
  });

  it('never shows N/A for answers the applicant gave', async () => {
    vi.mocked(getApplicationQuestions).mockResolvedValue([
      {
        questionKey: 'yard_fenced',
        category: 'household_information',
        questionText: 'Is your garden fenced?',
        questionType: 'text',
        displayOrder: 1,
      },
    ]);

    renderDetails(<ApplicationDetails rescueId="rsc-1" answers={{ yard_fenced: true }} />);

    expect(await screen.findByText('Yes')).toBeInTheDocument();
    expect(screen.queryByText('N/A')).toBeNull();
  });

  it("still shows the answers when the rescue's questions can't be loaded", async () => {
    vi.mocked(getApplicationQuestions).mockRejectedValue(new Error('offline'));

    renderDetails(<ApplicationDetails rescueId="rsc-1" answers={{ why_adopt: 'We love dogs' }} />);

    expect(await screen.findByText('We love dogs')).toBeInTheDocument();
    expect(screen.getByText('Why adopt')).toBeInTheDocument();
  });

  it('says so when no answers were submitted', async () => {
    vi.mocked(getApplicationQuestions).mockResolvedValue([]);

    renderDetails(<ApplicationDetails rescueId="rsc-1" answers={{}} />);

    expect(await screen.findByText(/no answers were submitted/i)).toBeInTheDocument();
  });
});
