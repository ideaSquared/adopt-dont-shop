import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { DateRangePicker, type DateRangePreset } from './DateRangePicker';
import { createDefaultDateRangePresets } from './presets';

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

  describe('presets', () => {
    const presets: DateRangePreset[] = [
      { label: 'Last 7 days', getRange: () => ({ from: '2026-07-30', to: '2026-08-06' }) },
      { label: 'This month', getRange: () => ({ from: '2026-08-01', to: '2026-08-31' }) },
    ];

    it('renders each preset as a button in a labelled group', () => {
      render(
        <DateRangePicker value={{ from: null, to: null }} onChange={() => {}} presets={presets} />
      );

      expect(screen.getByRole('group', { name: 'Quick date ranges' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Last 7 days' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'This month' })).toBeInTheDocument();
    });

    it('fires onChange with the preset range when a preset is clicked', () => {
      const onChange = vi.fn();
      render(
        <DateRangePicker value={{ from: null, to: null }} onChange={onChange} presets={presets} />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }));
      expect(onChange).toHaveBeenCalledWith({ from: '2026-07-30', to: '2026-08-06' });

      fireEvent.click(screen.getByRole('button', { name: 'This month' }));
      expect(onChange).toHaveBeenCalledWith({ from: '2026-08-01', to: '2026-08-31' });
    });

    it('renders no preset controls when presets are omitted', () => {
      render(<DateRangePicker value={{ from: null, to: null }} onChange={() => {}} />);

      expect(screen.queryByRole('group')).not.toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders no preset controls when presets is an empty array', () => {
      render(<DateRangePicker value={{ from: null, to: null }} onChange={() => {}} presets={[]} />);

      expect(screen.queryByRole('group')).not.toBeInTheDocument();
    });

    it('disables preset buttons when disabled', () => {
      render(
        <DateRangePicker
          value={{ from: null, to: null }}
          onChange={() => {}}
          presets={presets}
          disabled
        />
      );

      expect(screen.getByRole('button', { name: 'Last 7 days' })).toBeDisabled();
    });
  });
});

describe('createDefaultDateRangePresets', () => {
  // 6 August 2026, local time.
  const now = () => new Date(2026, 7, 6);

  it('offers the standard shortcut set', () => {
    expect(createDefaultDateRangePresets(now).map(preset => preset.label)).toEqual([
      'Last 7 days',
      'Last 30 days',
      'Last 90 days',
      'This month',
      'Last month',
    ]);
  });

  it('computes relative day ranges ending today', () => {
    const [sevenDays, thirtyDays, ninetyDays] = createDefaultDateRangePresets(now);

    expect(sevenDays.getRange()).toEqual({ from: '2026-07-30', to: '2026-08-06' });
    expect(thirtyDays.getRange()).toEqual({ from: '2026-07-07', to: '2026-08-06' });
    expect(ninetyDays.getRange()).toEqual({ from: '2026-05-08', to: '2026-08-06' });
  });

  it('computes calendar-month ranges', () => {
    const byLabel = new Map(
      createDefaultDateRangePresets(now).map(preset => [preset.label, preset])
    );

    expect(byLabel.get('This month')?.getRange()).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    });
    expect(byLabel.get('Last month')?.getRange()).toEqual({
      from: '2026-07-01',
      to: '2026-07-31',
    });
  });

  it('defaults to the real clock when none is injected', () => {
    const labels = createDefaultDateRangePresets().map(preset => preset.label);
    expect(labels).toContain('Last 7 days');
  });
});
