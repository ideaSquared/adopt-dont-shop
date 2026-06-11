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

const firstName: Question = {
  questionId: 'q3',
  questionKey: 'first_name',
  scope: 'core',
  category: 'about',
  questionType: 'text',
  questionText: 'What is your first name?',
  helpText: null,
  placeholder: null,
  options: null,
  isRequired: true,
  isEnabled: true,
  displayOrder: 1,
};

const lastName: Question = {
  questionId: 'q4',
  questionKey: 'last_name',
  scope: 'core',
  category: 'about',
  questionType: 'text',
  questionText: 'What is your last name?',
  helpText: null,
  placeholder: null,
  options: null,
  isRequired: true,
  isEnabled: true,
  displayOrder: 2,
};

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

describe('QuestionCategoryStep accessibility — validation errors', () => {
  it('focuses the first error field on submit', () => {
    render(<Wrapper questions={[firstName, lastName]} initialAnswers={{}} />);

    const form = document.getElementById('step-test-form');
    expect(form).not.toBeNull();
    if (!form) {
      return;
    }
    fireEvent.submit(form);

    const firstInput = screen.getAllByRole('textbox')[0];
    expect(document.activeElement).toBe(firstInput);
  });

  it('renders a role="alert" summary listing the count of missing fields', () => {
    render(<Wrapper questions={[firstName, lastName]} initialAnswers={{}} />);

    const form = document.getElementById('step-test-form');
    if (!form) {
      return;
    }
    fireEvent.submit(form);

    // There are also per-field role="alert" messages; the summary is the
    // alert that mentions the count of missing fields.
    const summary = screen
      .getAllByRole('alert')
      .find(node => /required fields? (is|are) missing/i.test(node.textContent ?? ''));
    expect(summary).toBeDefined();
    expect(summary).toHaveTextContent(/2 required fields are missing/i);
    expect(summary).toHaveTextContent(/first name/i);
    expect(summary).toHaveTextContent(/last name/i);
  });

  it('does not render the alert summary when there are no errors', () => {
    render(<Wrapper questions={[firstName]} initialAnswers={{ first_name: 'Ada' }} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

/**
 * UX P2 F — Required-field markers for screen readers.
 *
 * The `*` is rendered visually (aria-hidden) for sighted users. To surface the
 * required state to assistive tech, every input control that backs an
 * isRequired question must carry aria-required="true". Optional fields must
 * not.
 */
describe('QuestionCategoryStep — required-field markers (UX P2 F)', () => {
  const optionalMiddleName: Question = {
    questionId: 'q5',
    questionKey: 'middle_name',
    scope: 'core',
    category: 'about',
    questionType: 'text',
    questionText: 'What is your middle name?',
    helpText: null,
    placeholder: null,
    options: null,
    isRequired: false,
    isEnabled: true,
    displayOrder: 3,
  };

  it('renders aria-required on required inputs and the visible legend, and does not mark optional inputs', () => {
    render(<Wrapper questions={[firstName, optionalMiddleName]} initialAnswers={{}} />);

    // Legend explaining the * marker is shown when there is at least one required field.
    expect(screen.getByText(/Fields marked with \* are required/i)).toBeInTheDocument();

    const requiredInput = screen.getByRole('textbox', {
      name: /what is your first name\? \(required\)/i,
    });
    expect(requiredInput).toHaveAttribute('aria-required', 'true');

    // The optional input is not addressable by a (required) label and does not
    // carry aria-required.
    const optionalInput = screen.getAllByRole('textbox').find(el => el !== requiredInput);
    expect(optionalInput).toBeDefined();
    expect(optionalInput).not.toHaveAttribute('aria-required');
  });
});
