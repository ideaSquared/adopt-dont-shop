import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const getMock = vi.fn();
const putMock = vi.fn();

vi.mock('@/services', () => ({
  apiService: {
    get: (...args: unknown[]) => getMock(...args),
    put: (...args: unknown[]) => putMock(...args),
  },
}));

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({
      user: {
        userId: 'user-1',
        email: 'adopter@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        emailVerified: true,
        userType: 'adopter' as const,
        status: 'active' as const,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        preferences: {},
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      refreshUser: vi.fn(),
    }),
  };
});

import { OnboardingWizardPage } from './OnboardingWizardPage';

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <OnboardingWizardPage />
    </MemoryRouter>
  );

describe('OnboardingWizardPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    getMock.mockReset();
    putMock.mockReset();
    getMock.mockResolvedValue({
      data: {
        preferred_types: [],
        preferred_sizes: [],
        preferred_age_groups: [],
        preferred_energy: [],
        lifestyle: {},
        max_distance_km: null,
        open_to_special_needs: false,
        notify_new_matches: false,
        allergies: null,
      },
    });
  });

  it('renders step 1 (Home & Lifestyle) by default with a progress bar', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Home & Lifestyle')).toBeInTheDocument();
    });
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    // Step 1 questions visible
    expect(screen.getByText('What kind of home do you live in?')).toBeInTheDocument();
    expect(screen.getByText('Any allergies to consider?')).toBeInTheDocument();
  });

  it('navigates forward through all 4 steps with Next button', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Home & Lifestyle')).toBeInTheDocument();
    });

    // Go to step 2
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    expect(screen.getByText('Pet Preferences')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();

    // Go to step 3
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    expect(screen.getByText('Discovery Settings')).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();

    // Go to step 4 (review)
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    expect(screen.getByText('Review & Submit')).toBeInTheDocument();
    expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
  });

  it('goes back to previous step with Back button', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Home & Lifestyle')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^next$/i }));
    expect(screen.getByText('Pet Preferences')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^back$/i }));
    expect(screen.getByText('Home & Lifestyle')).toBeInTheDocument();
  });

  it('shows skip warning on step 1 first click, then advances on second click', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Home & Lifestyle')).toBeInTheDocument();
    });

    // First click shows warning
    await user.click(screen.getByRole('button', { name: /^skip$/i }));
    expect(
      screen.getByText(/top picks won't be personalized to your lifestyle/i)
    ).toBeInTheDocument();
    // Still on step 1
    expect(screen.getByText('Home & Lifestyle')).toBeInTheDocument();

    // Second click advances
    await user.click(screen.getByRole('button', { name: /^skip$/i }));
    expect(screen.getByText('Pet Preferences')).toBeInTheDocument();
  });

  it('submits all data to PUT /api/v1/match/profile on step 4 and navigates to top-picks', async () => {
    const user = userEvent.setup();
    putMock.mockResolvedValue({ data: {} });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Home & Lifestyle')).toBeInTheDocument();
    });

    // Fill in step 1
    await user.click(screen.getByRole('radio', { name: /apartment/i }));
    await user.click(screen.getByRole('radio', { name: /no children/i }));
    await user.click(screen.getByRole('radio', { name: /no other pets/i }));
    await user.click(screen.getByRole('radio', { name: /no allergies/i }));
    await user.click(screen.getByRole('radio', { name: /moderately active/i }));

    // Advance through steps
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.click(screen.getByRole('button', { name: /^next$/i }));

    expect(screen.getByText('Review & Submit')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save preferences/i }));

    await waitFor(() => {
      expect(putMock).toHaveBeenCalledTimes(1);
    });

    const [url, payload] = putMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toBe('/api/v1/match/profile');
    expect(payload).toHaveProperty('lifestyle');
    expect(payload).toHaveProperty('allergies');
    expect(payload).toHaveProperty('preferred_types');

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/match/top-picks');
    });
  });

  it('review step has edit buttons that navigate back to the correct step', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Home & Lifestyle')).toBeInTheDocument();
    });

    // Navigate to review step
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.click(screen.getByRole('button', { name: /^next$/i }));

    expect(screen.getByText('Review & Submit')).toBeInTheDocument();

    // Click the first Edit button (Home & Lifestyle)
    const editButtons = screen.getAllByRole('button', { name: /^edit$/i });
    expect(editButtons.length).toBe(3);

    await user.click(editButtons[0]);
    expect(screen.getByText('Home & Lifestyle')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
  });

  it('loads existing match profile data on mount', async () => {
    getMock.mockResolvedValue({
      data: {
        preferred_types: ['dog', 'cat'],
        preferred_sizes: ['medium'],
        preferred_age_groups: ['adult'],
        preferred_energy: ['medium'],
        lifestyle: { housing_type: 'apartment', has_children: false, yard: false },
        max_distance_km: 25,
        open_to_special_needs: true,
        notify_new_matches: true,
        allergies: 'cats',
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Home & Lifestyle')).toBeInTheDocument();
    });

    // Navigate to review to see loaded data
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.click(screen.getByRole('button', { name: /^next$/i }));

    expect(screen.getByText('Review & Submit')).toBeInTheDocument();
    // Check that loaded data appears in review
    expect(screen.getByText('Dog, Cat')).toBeInTheDocument();
    // 'Medium' appears in multiple review rows (sizes + energy); verify at least one exists
    expect(screen.getAllByText('Medium').length).toBeGreaterThanOrEqual(1);
  });

  // ADS-688: profile reload must preserve the granular children/pets selection
  // (not collapse everything to "young"/"dogs") and activity_level must reach
  // the API payload.
  describe('ADS-688 persistence fixes', () => {
    it('restores the original children_type selection on reload', async () => {
      getMock.mockResolvedValue({
        data: {
          preferred_types: [],
          preferred_sizes: [],
          preferred_age_groups: [],
          preferred_energy: [],
          lifestyle: { children_type: 'older', has_children: true },
          max_distance_km: null,
          open_to_special_needs: false,
          notify_new_matches: false,
          allergies: null,
        },
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Home & Lifestyle')).toBeInTheDocument();
      });

      const olderRadio = screen.getByRole('radio', { name: /older children/i });
      expect(olderRadio).toBeChecked();
    });

    it('restores the original other_pets_type selection on reload', async () => {
      getMock.mockResolvedValue({
        data: {
          preferred_types: [],
          preferred_sizes: [],
          preferred_age_groups: [],
          preferred_energy: [],
          lifestyle: { other_pets_type: 'cats', has_other_pets: true },
          max_distance_km: null,
          open_to_special_needs: false,
          notify_new_matches: false,
          allergies: null,
        },
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Home & Lifestyle')).toBeInTheDocument();
      });

      expect(screen.getByRole('radio', { name: /^cat\(s\)$/i })).toBeChecked();
    });

    it('restores "A mix" selection on reload', async () => {
      getMock.mockResolvedValue({
        data: {
          preferred_types: [],
          preferred_sizes: [],
          preferred_age_groups: [],
          preferred_energy: [],
          lifestyle: { other_pets_type: 'mixed', has_other_pets: true },
          max_distance_km: null,
          open_to_special_needs: false,
          notify_new_matches: false,
          allergies: null,
        },
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Home & Lifestyle')).toBeInTheDocument();
      });

      expect(screen.getByRole('radio', { name: /a mix/i })).toBeChecked();
    });

    it('includes activity_level and children_type/other_pets_type in the submitted payload', async () => {
      const user = userEvent.setup();
      putMock.mockResolvedValue({ data: {} });
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Home & Lifestyle')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('radio', { name: /older children/i }));
      await user.click(screen.getByRole('radio', { name: /^cat\(s\)$/i }));
      await user.click(screen.getByRole('radio', { name: /very active/i }));

      await user.click(screen.getByRole('button', { name: /^next$/i }));
      await user.click(screen.getByRole('button', { name: /^next$/i }));
      await user.click(screen.getByRole('button', { name: /^next$/i }));
      await user.click(screen.getByRole('button', { name: /save preferences/i }));

      await waitFor(() => {
        expect(putMock).toHaveBeenCalledTimes(1);
      });

      const [, payload] = putMock.mock.calls[0] as [string, { lifestyle: Record<string, unknown> }];
      expect(payload.lifestyle.children_type).toBe('older');
      expect(payload.lifestyle.other_pets_type).toBe('cats');
      expect(payload.lifestyle.activity_level).toBe('high');
    });
  });
});
