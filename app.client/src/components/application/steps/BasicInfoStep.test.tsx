import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// Override the global lib.components mock from setup-tests with a realistic
// Input that mirrors the real component's accessibility contract: a label
// associated by htmlFor, helper text in a <p> with an id, and aria-describedby
// pointing at that id when helperText is supplied. This is the behaviour the
// real lib.components Input gives us, and what we want to assert here.
vi.mock('@adopt-dont-shop/lib.components', () => {
  type InputLikeProps = React.ComponentPropsWithoutRef<'input'> & {
    label?: string;
    helperText?: string;
    error?: string;
  };
  const Input = React.forwardRef<HTMLInputElement, InputLikeProps>(
    ({ label, helperText, error, id, ...rest }, ref) => {
      const reactId = React.useId();
      const inputId = id ?? reactId;
      const helpText = error ?? helperText;
      const helperId = helpText ? `${inputId}-helper` : undefined;
      return React.createElement(
        'div',
        null,
        label && React.createElement('label', { htmlFor: inputId }, label),
        React.createElement('input', {
          id: inputId,
          ref,
          'aria-describedby': helperId,
          ...rest,
        }),
        helpText && React.createElement('p', { id: helperId }, helpText)
      );
    }
  );
  Input.displayName = 'Input';
  return { Input };
});

import { BasicInfoStep } from './BasicInfoStep';

describe('BasicInfoStep — UK mobile phone field guidance', () => {
  const noop = () => undefined;

  it('labels the phone field as a UK mobile number so the constraint is visible before typing', () => {
    render(<BasicInfoStep data={{}} onComplete={noop} />);

    const phoneInput = screen.getByLabelText(/UK Mobile Phone Number/i);
    expect(phoneInput).toBeInTheDocument();
    expect(phoneInput).toHaveAttribute('type', 'tel');
  });

  it('shows helper text explaining that only UK mobile numbers are accepted, with examples', () => {
    render(<BasicInfoStep data={{}} onComplete={noop} />);

    const helper = screen.getByText(
      /We can only accept UK mobile numbers \(e\.g\. 07123 456789 or \+44 7123 456789\)/i
    );
    expect(helper).toBeInTheDocument();
  });

  it('wires aria-describedby on the phone input to the helper text element so assistive tech announces the constraint', () => {
    render(<BasicInfoStep data={{}} onComplete={noop} />);

    const phoneInput = screen.getByLabelText(/UK Mobile Phone Number/i);
    const describedBy = phoneInput.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();

    const helper = describedBy ? document.getElementById(describedBy) : null;
    expect(helper).not.toBeNull();
    expect(helper?.textContent).toMatch(
      /We can only accept UK mobile numbers \(e\.g\. 07123 456789 or \+44 7123 456789\)/i
    );
  });
});
