import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { FormField, FormRow, FormSection } from './FormField';

describe('FormSection', () => {
  it('renders a title and description in a header', () => {
    render(
      <FormSection title='Basic Information' description='Tell us about yourself'>
        <p>child</p>
      </FormSection>
    );

    expect(screen.getByRole('heading', { name: 'Basic Information' })).toBeInTheDocument();
    expect(screen.getByText('Tell us about yourself')).toBeInTheDocument();
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('omits the header when neither title nor description is provided', () => {
    render(
      <FormSection>
        <p>child</p>
      </FormSection>
    );

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});

describe('FormRow', () => {
  it('renders children in a grid', () => {
    render(
      <FormRow>
        <span>one</span>
        <span>two</span>
      </FormRow>
    );

    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
  });
});

describe('FormField', () => {
  it('renders a label tied to its control', () => {
    render(
      <FormField label='Email' htmlFor='email-input'>
        <input id='email-input' />
      </FormField>
    );

    const input = screen.getByLabelText('Email');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'email-input');
  });

  it('shows description when no error is set', () => {
    render(
      <FormField label='Email' description='Used for login'>
        <input />
      </FormField>
    );

    expect(screen.getByText('Used for login')).toBeInTheDocument();
  });

  it('shows error and hides description when error is set', () => {
    render(
      <FormField label='Email' description='Used for login' error='Email is required'>
        <input />
      </FormField>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Email is required');
    expect(screen.queryByText('Used for login')).not.toBeInTheDocument();
  });

  it('renders without crashing when marked required', () => {
    render(
      <FormField label='Email' required>
        <input />
      </FormField>
    );

    expect(screen.getByText('Email')).toBeInTheDocument();
  });
});
