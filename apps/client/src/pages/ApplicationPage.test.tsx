/**
 * ApplicationPage loads the pet, the rescue's questions and the adopter's saved
 * defaults before showing the form, and sends adopters who already have an
 * active application for the pet to that application instead.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@/test-utils/render';
import type { Question } from '@/components/application/QuestionField';

const navigateMock = vi.fn();
const getPetByIdMock = vi.fn();
const apiGetMock = vi.fn();
const getDefaultsMock = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ petId: 'pet-1' }),
  };
});

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({
      user: { userId: 'u-1', email: 'a@b.c' },
      isAuthenticated: true,
      isLoading: false,
    }),
  };
});

vi.mock('@/services', () => ({
  petService: { getPetById: (...args: unknown[]) => getPetByIdMock(...args) },
  apiService: { get: (...args: unknown[]) => apiGetMock(...args), post: vi.fn() },
}));

vi.mock('@/services/applicationProfileService', () => ({
  applicationProfileService: {
    getApplicationDefaults: () => getDefaultsMock(),
    updateApplicationDefaults: vi.fn(),
  },
}));

vi.mock('@/hooks/useApplicationDraft', () => ({
  useApplicationDraft: () => ({
    saveStatus: 'idle',
    lastSaved: null,
    scheduleSave: vi.fn(),
    saveNow: vi.fn(),
    clearDraft: vi.fn(),
    loadedDraft: null,
  }),
}));

vi.mock('@/components/application', () => ({
  ApplicationForm: ({ categories }: { categories: { title: string }[] }) => (
    <div data-testid='application-form'>{categories.map(c => c.title).join('|')}</div>
  ),
  ApplicationProgress: () => <div data-testid='application-progress' />,
  QuickApplyView: () => <div data-testid='quick-apply' />,
}));

import { ApplicationPage } from './ApplicationPage';

const pet = { pet_id: 'pet-1', name: 'Luna', rescue_id: 'rescue-1' };

const question: Question = {
  questionId: 'q-1',
  questionKey: 'garden_description',
  scope: 'rescue_specific',
  category: 'household_information',
  questionType: 'text',
  questionText: 'Describe your garden',
  helpText: null,
  placeholder: null,
  options: null,
  isRequired: true,
  isEnabled: true,
  displayOrder: 1,
};

const mockApi = (applications: unknown[]) => {
  apiGetMock.mockImplementation((url: string) =>
    url.includes('/questions')
      ? Promise.resolve({ data: [question] })
      : Promise.resolve({ data: applications })
  );
};

describe('ApplicationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPetByIdMock.mockResolvedValue(pet);
    getDefaultsMock.mockResolvedValue(null);
  });

  it('shows the guided form for the pet once the questions have loaded', async () => {
    mockApi([]);

    render(<ApplicationPage />);

    expect(await screen.findByTestId('application-form')).toHaveTextContent('Your home');
    expect(screen.getByRole('heading', { name: /get you adopting luna/i })).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('sends the adopter to their active application instead of showing the form', async () => {
    mockApi([{ id: 'app-9', petId: 'pet-1', status: 'submitted' }]);

    render(<ApplicationPage />);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/applications/app-9', {
        state: { message: 'You already have an active application for this pet.' },
      });
    });
  });

  it('offers a retry when the application information cannot be loaded', async () => {
    const user = userEvent.setup();
    getPetByIdMock.mockRejectedValueOnce(new Error('boom'));
    mockApi([]);

    render(<ApplicationPage />);

    expect(await screen.findByText(/failed to load application information/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByTestId('application-form')).toBeInTheDocument();
  });
});
