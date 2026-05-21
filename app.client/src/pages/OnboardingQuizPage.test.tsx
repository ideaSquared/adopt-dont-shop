import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const updateProfileMock = vi.fn();
const navigateMock = vi.fn();

const mockUser = {
  userId: 'user-1',
  email: 'adopter@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  emailVerified: true,
  userType: 'adopter' as const,
  status: 'active' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  preferences: {
    petTypes: ['dog'],
    maxDistance: 25,
    newsletterOptIn: false,
  },
};

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: updateProfileMock,
      refreshUser: vi.fn(),
    }),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

import { OnboardingQuizPage } from './OnboardingQuizPage';

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/onboarding/quiz']}>
      <OnboardingQuizPage />
    </MemoryRouter>
  );

describe('OnboardingQuizPage', () => {
  beforeEach(() => {
    updateProfileMock.mockReset();
    navigateMock.mockReset();
  });

  it('renders at least 5 questions for the user to answer', () => {
    renderPage();

    const radioGroups = screen.getAllByRole('radiogroup');
    expect(radioGroups.length).toBeGreaterThanOrEqual(5);
  });

  it('saves selected answers to user.preferences and navigates to /discover on Finish', async () => {
    const user = userEvent.setup();
    updateProfileMock.mockResolvedValue(undefined);

    renderPage();

    // Answer the first two questions to exercise the answer-collection path.
    await user.click(screen.getByRole('radio', { name: /house with a yard/i }));
    await user.click(screen.getByRole('radio', { name: /no children/i }));

    await user.click(screen.getByRole('button', { name: /^finish$/i }));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledTimes(1);
    });

    const patch = updateProfileMock.mock.calls[0][0];
    expect(patch.preferences).toBeDefined();
    // Existing preference fields are preserved.
    expect(patch.preferences.petTypes).toEqual(['dog']);
    expect(patch.preferences.maxDistance).toBe(25);
    // Quiz answers are persisted under the `quiz` extension key.
    expect(patch.preferences.quiz.homeType).toBe('house_with_yard');
    expect(patch.preferences.quiz.kids).toBe('none');

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/discover');
    });
  });

  it('shows a personalisation warning the first time the user clicks Skip', async () => {
    const user = userEvent.setup();

    renderPage();

    expect(screen.queryByText(/matches won't be personalised/i)).not.toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^skip$/i }));

    expect(screen.getByText(/matches won't be personalised/i)).toBeInTheDocument();
    // First skip click only surfaces the warning — it should NOT navigate.
    expect(navigateMock).not.toHaveBeenCalled();
    expect(updateProfileMock).not.toHaveBeenCalled();

    // Second skip click confirms and redirects to /discover.
    await user.click(screen.getByRole('button', { name: /^skip$/i }));
    expect(navigateMock).toHaveBeenCalledWith('/discover');
  });
});
