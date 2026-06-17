import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuthLayout } from './AuthLayout';

describe('AuthLayout', () => {
  it('renders the title and the wrapped form content', () => {
    render(
      <AuthLayout title="Sign in">
        <button type="button">Submit</button>
      </AuthLayout>
    );

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('renders the subtitle and footer when provided', () => {
    render(
      <AuthLayout title="Sign in" subtitle="Welcome back" footer={<a href="/help">Need help?</a>}>
        <span>content</span>
      </AuthLayout>
    );

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Need help?' })).toBeInTheDocument();
  });

  it('omits the subtitle and footer when not provided', () => {
    render(
      <AuthLayout title="Sign in">
        <span>content</span>
      </AuthLayout>
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
