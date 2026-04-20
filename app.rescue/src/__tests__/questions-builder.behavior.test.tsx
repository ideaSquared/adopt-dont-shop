/**
 * Behavioral tests for Questions Builder feature (Rescue App)
 *
 * Tests rescue staff-facing behavior through the public interface:
 * - Staff can view all application questions (core and custom)
 * - Staff can add new custom questions
 * - Staff can edit existing custom questions
 * - Staff can delete custom questions
 * - Staff can enable/disable questions
 * - Staff can reorder questions within a category
 * - Staff can use question templates
 * - Staff sees validation errors when creating invalid questions
 * - Staff can configure conditional logic for questions
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, userEvent } from '../test-utils';
import QuestionsBuilder from '../components/rescue/QuestionsBuilder';

vi.mock('../services/libraryServices', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../utils/env', () => ({
  getApiBaseUrl: () => 'http://localhost:5000',
  isDevelopment: () => false,
}));

import { apiService } from '../services/libraryServices';

const RESCUE_ID = 'rescue-uuid-123';

const mockCoreQuestion = {
  questionId: 'core-q-1',
  rescueId: null,
  questionKey: 'full_name',
  scope: 'core',
  category: 'personal_information',
  questionType: 'text',
  questionText: 'What is your full name?',
  helpText: null,
  placeholder: null,
  options: null,
  validationRules: null,
  displayOrder: 0,
  isEnabled: true,
  isRequired: true,
  conditionalLogic: null,
};

const mockCustomQuestion = {
  questionId: 'custom-q-1',
  rescueId: RESCUE_ID,
  questionKey: 'garden_size',
  scope: 'rescue_specific',
  category: 'household_information',
  questionType: 'text',
  questionText: 'What is the size of your garden?',
  helpText: 'Approximate area in square metres',
  placeholder: null,
  options: null,
  validationRules: null,
  displayOrder: 0,
  isEnabled: true,
  isRequired: false,
  conditionalLogic: null,
};

const mockConditionalQuestion = {
  questionId: 'custom-q-2',
  rescueId: RESCUE_ID,
  questionKey: 'containment_plan',
  scope: 'rescue_specific',
  category: 'household_information',
  questionType: 'text',
  questionText: 'Without a fence, how will you contain the dog?',
  helpText: null,
  placeholder: null,
  options: null,
  validationRules: null,
  displayOrder: 1,
  isEnabled: true,
  isRequired: false,
  conditionalLogic: { showWhen: { questionKey: 'has_fence', operator: 'is_false' } },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiService.get).mockResolvedValue({
    questions: [mockCoreQuestion, mockCustomQuestion],
  });
  vi.mocked(apiService.post).mockResolvedValue({ success: true, question: mockCustomQuestion });
  vi.mocked(apiService.put).mockResolvedValue({ success: true, question: mockCustomQuestion });
  vi.mocked(apiService.patch).mockResolvedValue({ success: true });
  vi.mocked(apiService.delete).mockResolvedValue({ success: true });
});

describe('Questions Builder - Behavioral Tests', () => {
  describe('Loading questions', () => {
    it('shows a loading state while questions are fetched', () => {
      vi.mocked(apiService.get).mockImplementation(() => new Promise(() => undefined));
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      expect(screen.getByText(/loading questions/i)).toBeInTheDocument();
    });

    it('displays core and custom questions once loaded', async () => {
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => {
        expect(screen.getByText('What is your full name?')).toBeInTheDocument();
        expect(screen.getByText('What is the size of your garden?')).toBeInTheDocument();
      });
    });

    it('labels core questions as non-editable', async () => {
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => {
        expect(screen.getByText('Core question')).toBeInTheDocument();
      });
    });

    it('shows an error message when loading fails', async () => {
      vi.mocked(apiService.get).mockRejectedValue(new Error('Network error'));
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('shows question help text when available', async () => {
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => {
        expect(screen.getByText('Approximate area in square metres')).toBeInTheDocument();
      });
    });

    it('shows conditional badge on questions with conditional logic', async () => {
      vi.mocked(apiService.get).mockResolvedValue({
        questions: [mockCustomQuestion, mockConditionalQuestion],
      });

      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => {
        expect(screen.getByText('Conditional')).toBeInTheDocument();
      });
    });
  });

  describe('Adding a custom question', () => {
    it('opens the question form when Add Question is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => {
        expect(screen.getByTestId('add-question-btn')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('add-question-btn'));

      expect(screen.getByTestId('question-form')).toBeInTheDocument();
      expect(screen.getByText('Add New Question')).toBeInTheDocument();
    });

    it('auto-generates question key from question text', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => expect(screen.getByTestId('add-question-btn')).toBeInTheDocument());
      await user.click(screen.getByTestId('add-question-btn'));

      const textInput = screen.getByTestId('question-text-input');
      await user.type(textInput, 'Do you have a garden?');

      const keyInput = screen.getByTestId('question-key-input') as HTMLInputElement;
      expect(keyInput.value).toBe('do_you_have_a_garden');
    });

    it('shows question templates for quick creation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => expect(screen.getByTestId('add-question-btn')).toBeInTheDocument());
      await user.click(screen.getByTestId('add-question-btn'));

      expect(screen.getByText('Quick templates')).toBeInTheDocument();
      expect(screen.getByText('Years of pet experience')).toBeInTheDocument();
      expect(screen.getByText('Current living situation')).toBeInTheDocument();
    });

    it('populates the form when a template is selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => expect(screen.getByTestId('add-question-btn')).toBeInTheDocument());
      await user.click(screen.getByTestId('add-question-btn'));
      await user.click(screen.getByTestId('template-hours-alone-per-day'));

      const textInput = screen.getByTestId('question-text-input') as HTMLInputElement;
      expect(textInput.value).toContain('hours per day');
    });

    it('creates a question when the form is submitted with valid data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => expect(screen.getByTestId('add-question-btn')).toBeInTheDocument());
      await user.click(screen.getByTestId('add-question-btn'));

      await user.type(screen.getByTestId('question-text-input'), 'Do you have outdoor space?');

      await user.click(screen.getByTestId('save-question-btn'));

      await waitFor(() => {
        expect(vi.mocked(apiService.post)).toHaveBeenCalledWith(
          expect.stringContaining(`/rescues/${RESCUE_ID}/questions`),
          expect.objectContaining({ questionText: 'Do you have outdoor space?' })
        );
      });
    });

    it('shows success message after creating a question', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => expect(screen.getByTestId('add-question-btn')).toBeInTheDocument());
      await user.click(screen.getByTestId('add-question-btn'));
      await user.type(screen.getByTestId('question-text-input'), 'Do you have outdoor space?');
      await user.click(screen.getByTestId('save-question-btn'));

      await waitFor(() => {
        expect(screen.getByText(/question created successfully/i)).toBeInTheDocument();
      });
    });

    it('cancels form and returns to list view', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => expect(screen.getByTestId('add-question-btn')).toBeInTheDocument());
      await user.click(screen.getByTestId('add-question-btn'));

      expect(screen.getByTestId('question-form')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByTestId('question-form')).not.toBeInTheDocument();
    });
  });

  describe('Form validation', () => {
    it('shows error when question text is too short', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => expect(screen.getByTestId('add-question-btn')).toBeInTheDocument());
      await user.click(screen.getByTestId('add-question-btn'));

      await user.type(screen.getByTestId('question-text-input'), 'Hi?');
      await user.click(screen.getByTestId('save-question-btn'));

      expect(screen.getByText(/must be at least 5 characters/i)).toBeInTheDocument();
      expect(vi.mocked(apiService.post)).not.toHaveBeenCalled();
    });

    it('shows error when question key contains invalid characters', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => expect(screen.getByTestId('add-question-btn')).toBeInTheDocument());
      await user.click(screen.getByTestId('add-question-btn'));

      await user.type(screen.getByTestId('question-text-input'), 'Valid question text here');
      const keyInput = screen.getByTestId('question-key-input');
      await user.clear(keyInput);
      await user.type(keyInput, 'invalid-KEY!');

      await user.click(screen.getByTestId('save-question-btn'));

      expect(
        screen.getByText(/only lowercase letters, numbers, and underscores/i)
      ).toBeInTheDocument();
    });

    it('shows error when conditional logic is invalid JSON', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => expect(screen.getByTestId('add-question-btn')).toBeInTheDocument());
      await user.click(screen.getByTestId('add-question-btn'));

      await user.type(screen.getByTestId('question-text-input'), 'Valid question text here');

      const conditionalInput = screen.getByTestId('conditional-logic-input');
      await user.clear(conditionalInput);
      await user.paste('not valid json at all');

      await user.click(screen.getByTestId('save-question-btn'));

      expect(screen.getByText(/must be valid json/i)).toBeInTheDocument();
    });
  });

  describe('Editing questions', () => {
    it('opens the edit form pre-populated with existing question data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => {
        expect(screen.getByTestId(`edit-${mockCustomQuestion.questionId}`)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId(`edit-${mockCustomQuestion.questionId}`));

      const textInput = screen.getByTestId('question-text-input') as HTMLInputElement;
      expect(textInput.value).toBe('What is the size of your garden?');
      expect(screen.getByText('Edit Question')).toBeInTheDocument();
    });

    it('submits updated data when the edit form is saved', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => {
        expect(screen.getByTestId(`edit-${mockCustomQuestion.questionId}`)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId(`edit-${mockCustomQuestion.questionId}`));

      const textInput = screen.getByTestId('question-text-input');
      await user.clear(textInput);
      await user.type(textInput, 'Updated question text here');

      await user.click(screen.getByTestId('save-question-btn'));

      await waitFor(() => {
        expect(vi.mocked(apiService.put)).toHaveBeenCalledWith(
          expect.stringContaining(
            `/rescues/${RESCUE_ID}/questions/${mockCustomQuestion.questionId}`
          ),
          expect.objectContaining({ questionText: 'Updated question text here' })
        );
      });
    });

    it('shows success message after updating a question', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => {
        expect(screen.getByTestId(`edit-${mockCustomQuestion.questionId}`)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId(`edit-${mockCustomQuestion.questionId}`));
      await user.click(screen.getByTestId('save-question-btn'));

      await waitFor(() => {
        expect(screen.getByText(/question updated successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Deleting questions', () => {
    it('deletes a question after confirmation', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => {
        expect(screen.getByTestId(`delete-${mockCustomQuestion.questionId}`)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId(`delete-${mockCustomQuestion.questionId}`));

      await waitFor(() => {
        expect(vi.mocked(apiService.delete)).toHaveBeenCalledWith(
          expect.stringContaining(
            `/rescues/${RESCUE_ID}/questions/${mockCustomQuestion.questionId}`
          )
        );
      });
    });

    it('does not delete when confirmation is cancelled', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => {
        expect(screen.getByTestId(`delete-${mockCustomQuestion.questionId}`)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId(`delete-${mockCustomQuestion.questionId}`));

      expect(vi.mocked(apiService.delete)).not.toHaveBeenCalled();
    });
  });

  describe('Enabling and disabling questions', () => {
    it('disables an enabled question when the Disable button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => {
        expect(screen.getByTestId(`toggle-${mockCustomQuestion.questionId}`)).toBeInTheDocument();
      });

      expect(
        screen.getByTestId(`toggle-${mockCustomQuestion.questionId}`)
      ).toHaveTextContent('Disable');

      await user.click(screen.getByTestId(`toggle-${mockCustomQuestion.questionId}`));

      expect(vi.mocked(apiService.put)).toHaveBeenCalledWith(
        expect.stringContaining(
          `/rescues/${RESCUE_ID}/questions/${mockCustomQuestion.questionId}`
        ),
        { isEnabled: false }
      );
    });

    it('shows Enable button for disabled questions', async () => {
      const disabledQuestion = { ...mockCustomQuestion, isEnabled: false };
      vi.mocked(apiService.get).mockResolvedValue({
        questions: [disabledQuestion],
      });

      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => {
        expect(screen.getByTestId(`toggle-${disabledQuestion.questionId}`)).toHaveTextContent(
          'Enable'
        );
      });
    });
  });

  describe('Reordering questions', () => {
    it('moves a question up when the up arrow is clicked', async () => {
      const question2 = {
        ...mockCustomQuestion,
        questionId: 'custom-q-2',
        questionText: 'Second question in category',
        displayOrder: 1,
      };
      vi.mocked(apiService.get).mockResolvedValue({
        questions: [mockCustomQuestion, question2],
      });

      const user = userEvent.setup();
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => {
        expect(screen.getByTestId(`move-up-${question2.questionId}`)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId(`move-up-${question2.questionId}`));

      expect(vi.mocked(apiService.patch)).toHaveBeenCalledWith(
        expect.stringContaining(`/rescues/${RESCUE_ID}/questions/reorder`),
        expect.objectContaining({
          questions: expect.arrayContaining([
            expect.objectContaining({ questionId: question2.questionId }),
            expect.objectContaining({ questionId: mockCustomQuestion.questionId }),
          ]),
        })
      );
    });

    it('disables the up arrow for the first question in a category', async () => {
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => {
        expect(
          screen.getByTestId(`move-up-${mockCustomQuestion.questionId}`)
        ).toBeInTheDocument();
      });

      expect(screen.getByTestId(`move-up-${mockCustomQuestion.questionId}`)).toBeDisabled();
    });
  });

  describe('Question required/optional configuration', () => {
    it('shows required badge for required questions', async () => {
      vi.mocked(apiService.get).mockResolvedValue({
        questions: [{ ...mockCustomQuestion, isRequired: true }],
      });

      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => {
        expect(screen.getByText('Required')).toBeInTheDocument();
      });
    });

    it('shows optional badge for non-required questions', async () => {
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => {
        expect(screen.getByText('Optional')).toBeInTheDocument();
      });
    });

    it('can mark a question as required when creating', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuestionsBuilder rescueId={RESCUE_ID} />);

      await waitFor(() => expect(screen.getByTestId('add-question-btn')).toBeInTheDocument());
      await user.click(screen.getByTestId('add-question-btn'));

      await user.type(screen.getByTestId('question-text-input'), 'Required question text');
      await user.click(screen.getByTestId('question-required-checkbox'));
      await user.click(screen.getByTestId('save-question-btn'));

      await waitFor(() => {
        expect(vi.mocked(apiService.post)).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ isRequired: true })
        );
      });
    });
  });
});
