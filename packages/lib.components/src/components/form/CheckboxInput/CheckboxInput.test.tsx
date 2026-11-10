import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useRef } from 'react';
import { CheckboxInput } from './CheckboxInput';

const renderWithTheme = (component: React.ReactElement) => render(component);

describe('CheckboxInput', () => {
  it('renders correctly with default props', () => {
    renderWithTheme(<CheckboxInput />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('displays label when provided', () => {
    renderWithTheme(<CheckboxInput label='Accept terms' />);
    const label = screen.getByText('Accept terms');
    expect(label).toBeInTheDocument();
  });

  it('handles checked state correctly', () => {
    renderWithTheme(<CheckboxInput checked onChange={() => {}} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('handles unchecked state correctly', () => {
    renderWithTheme(<CheckboxInput checked={false} onChange={() => {}} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('handles change events', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    renderWithTheme(<CheckboxInput onChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(handleChange).toHaveBeenCalled();
  });

  it('disables checkbox when disabled prop is true', () => {
    renderWithTheme(<CheckboxInput disabled />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  it('shows error state with error message', () => {
    renderWithTheme(<CheckboxInput error='This field is required' />);
    const errorMessage = screen.getByText('This field is required');
    expect(errorMessage).toBeInTheDocument();
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<CheckboxInput data-testid='test-checkbox' />);
    const checkbox = screen.getByTestId('test-checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('applies different sizes correctly', () => {
    renderWithTheme(<CheckboxInput size='lg' label='Large checkbox' />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('handles intermediate state correctly', () => {
    renderWithTheme(<CheckboxInput indeterminate />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('sets aria-required when required is true', () => {
    renderWithTheme(<CheckboxInput required />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-required', 'true');
  });

  it('does not set aria-required when required is false', () => {
    renderWithTheme(<CheckboxInput />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toHaveAttribute('aria-required');
  });

  it('forwards ref to the underlying checkbox input', () => {
    const RefTest: React.FC = () => {
      const inputRef = useRef<HTMLInputElement>(null);
      return (
        <>
          <CheckboxInput ref={inputRef} data-testid='ref-checkbox' />
          <button onClick={() => inputRef.current?.focus()}>focus</button>
        </>
      );
    };
    renderWithTheme(<RefTest />);
    const checkbox = screen.getByTestId('ref-checkbox');
    act(() => {
      screen.getByText('focus').click();
    });
    expect(checkbox).toHaveFocus();
  });

  describe('without a ref from the caller', () => {
    it('toggles when the visible box is clicked', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      renderWithTheme(<CheckboxInput label='Required field' onChange={handleChange} />);

      await user.click(screen.getByText('✓'));

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('toggles with Enter and Space on its focusable wrapper', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      renderWithTheme(<CheckboxInput label='Required field' onChange={handleChange} />);

      screen.getByRole('button').focus();
      await user.keyboard('{Enter}');
      await user.keyboard(' ');

      expect(handleChange).toHaveBeenCalledTimes(2);
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });
  });

  it('toggles exactly once when its label is clicked, with or without a ref', async () => {
    const user = userEvent.setup();
    const WithRef: React.FC = () => {
      const inputRef = useRef<HTMLInputElement>(null);
      return <CheckboxInput ref={inputRef} label='With ref' />;
    };
    renderWithTheme(
      <>
        <CheckboxInput label='Without ref' />
        <WithRef />
      </>
    );

    await user.click(screen.getByText('Without ref'));
    await user.click(screen.getByText('With ref'));

    expect(screen.getByRole('checkbox', { name: 'Without ref' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'With ref' })).toBeChecked();
  });
});
