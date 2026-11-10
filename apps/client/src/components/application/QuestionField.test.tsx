import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils/render';
import { QuestionField, type Question, type QuestionType } from './QuestionField';

const makeQuestion = (overrides: Partial<Question> = {}): Question => ({
  questionId: 'q1',
  questionKey: 'sample',
  scope: 'core',
  category: 'about',
  questionType: 'text',
  questionText: 'Sample question',
  helpText: null,
  placeholder: null,
  options: null,
  isRequired: true,
  isEnabled: true,
  displayOrder: 1,
  ...overrides,
});

describe('QuestionField answers', () => {
  it.each<[QuestionType, string]>([
    ['text', 'Alex'],
    ['email', 'alex@example.com'],
    ['phone', '07700900123'],
    ['address', '1 High Street'],
  ])('reports the typed answer for a %s question', (questionType, typed) => {
    const onChange = vi.fn();
    render(
      <QuestionField
        question={makeQuestion({ questionType })}
        value={undefined}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Sample question (required)'), {
      target: { value: typed },
    });

    expect(onChange).toHaveBeenCalledWith(typed);
  });

  it('reports a number answer as a number', () => {
    const onChange = vi.fn();
    render(
      <QuestionField
        question={makeQuestion({ questionType: 'number' })}
        value={undefined}
        onChange={onChange}
      />
    );
    const input = screen.getByLabelText('Sample question (required)');

    fireEvent.change(input, { target: { value: '3' } });
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  it('reports a chosen date', () => {
    const onChange = vi.fn();
    render(
      <QuestionField
        question={makeQuestion({ questionType: 'date' })}
        value={undefined}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Sample question (required)'), {
      target: { value: '2025-03-01' },
    });

    expect(onChange).toHaveBeenCalledWith('2025-03-01');
  });

  it('adds and removes options of a multi-select question', () => {
    const onChange = vi.fn();
    render(
      <QuestionField
        question={makeQuestion({ questionType: 'multi_select', options: ['Dogs', 'Cats'] })}
        value={['Dogs']}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Cats'));
    expect(onChange).toHaveBeenLastCalledWith(['Dogs', 'Cats']);

    fireEvent.click(screen.getByLabelText('Dogs'));
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('shows the validation error to assistive tech', () => {
    render(
      <QuestionField
        question={makeQuestion()}
        value={undefined}
        onChange={vi.fn()}
        error='This field is required'
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });
});
