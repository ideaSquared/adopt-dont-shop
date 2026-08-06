import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { DateRangePicker } from './DateRangePicker';

describe('DateRangePicker', () => {
  it('renders two labelled date fields', () => {
    render(
      <DateRangePicker value={{ from: null, to: null }} onChange={() => {}} data-testid='drp' />
    );

    expect(screen.getByTestId('drp')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
  });

  it('uses custom labels', () => {
    render(
      <DateRangePicker
        value={{ from: null, to: null }}
        onChange={() => {}}
        fromLabel='Start'
        toLabel='End'
      />
    );

    expect(screen.getByLabelText('Start')).toBeInTheDocument();
    expect(screen.getByLabelText('End')).toBeInTheDocument();
  });

  it('calls onChange with the merged value when the from field changes', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ from: null, to: '2026-08-20' }} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-08-10' } });

    expect(onChange).toHaveBeenCalledWith({ from: '2026-08-10', to: '2026-08-20' });
  });

  it('calls onChange with the merged value when the to field changes', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ from: '2026-08-10', to: null }} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-08-20' } });

    expect(onChange).toHaveBeenCalledWith({ from: '2026-08-10', to: '2026-08-20' });
  });

  it('reports a cleared field as null', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ from: '2026-08-10', to: null }} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith({ from: null, to: null });
  });

  it('surfaces an accessible error when the range is invalid (to before from)', () => {
    render(
      <DateRangePicker value={{ from: '2026-08-20', to: '2026-08-10' }} onChange={() => {}} />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/on or after/i);
  });

  it('renders a caller-provided error message', () => {
    render(
      <DateRangePicker
        value={{ from: null, to: null }}
        onChange={() => {}}
        error='Dates required'
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Dates required');
  });

  it('disables both fields when disabled', () => {
    render(<DateRangePicker value={{ from: null, to: null }} onChange={() => {}} disabled />);

    expect(screen.getByLabelText('From')).toBeDisabled();
    expect(screen.getByLabelText('To')).toBeDisabled();
  });
});
