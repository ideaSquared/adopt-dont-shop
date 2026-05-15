import { describe, it, expect, vi, beforeAll } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@/test-utils/render';
import { QuestionCategoryStep } from './QuestionCategoryStep';
import type { Question } from './QuestionField';

beforeAll(() => {
  // jsdom doesn't implement scrollIntoView; stub it so the component's
  // submit handler can run end-to-end in tests.
  Element.prototype.scrollIntoView = vi.fn();
});

const homeOwnership: Question = {
  questionId: 'q1',
  questionKey: 'home_ownership',
  scope: 'core',
  category: 'housing',
  questionType: 'select',
  questionText: 'Do you rent or own?',
  helpText: null,
  placeholder: null,
  options: ['Rent', 'Own'],
  isRequired: true,
  isEnabled: true,
  displayOrder: 1,
};

const landlordPermission: Question = {
  questionId: 'q2',
  questionKey: 'landlord_permission',
  scope: 'core',
  category: 'housing',
  questionType: 'boolean',
  questionText: 'Do you have landlord permission?',
  helpText: null,
  placeholder: null,
  options: null,
  isRequired: true,
  isEnabled: true,
  displayOrder: 2,
};

type WrapperProps = {
  questions: Question[];
  initialAnswers?: Record<string, unknown>;
  onComplete?: (answers: Record<string, unknown>) => void;
};

const Wrapper = ({ questions, initialAnswers = {}, onComplete = vi.fn() }: WrapperProps) => {
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  return (
    <QuestionCategoryStep
      stepId='test'
      title='Test step'
      questions={questions}
      answers={answers}
      onChange={setAnswers}
      onComplete={onComplete}
    />
  );
};

describe('QuestionCategoryStep accessibility — conditional reveals', () => {
  it('renders a polite live region for the conditional questions', () => {
    const { container } = render(
      <Wrapper questions={[homeOwnership, landlordPermission]} initialAnswers={{}} />
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
  });

  it('announces a sentence when a conditional question becomes visible', () => {
    render(<Wrapper questions={[homeOwnership, landlordPermission]} initialAnswers={{}} />);

    // landlord_permission is hidden initially
    expect(screen.queryByText(/Do you have landlord permission/i)).not.toBeInTheDocument();

    // home_ownership renders as OptionTiles (radio inputs) for this key.
    const rentRadio = screen.getByRole('radio', { name: /Rent/i });
    fireEvent.click(rentRadio);

    // After picking Rent, the conditional question shows AND an announcement is rendered
    // (the matcher catches both the visible label and the live-region announcement).
    expect(screen.getAllByText(/Do you have landlord permission/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/additional question/i)).toBeInTheDocument();
  });
});
