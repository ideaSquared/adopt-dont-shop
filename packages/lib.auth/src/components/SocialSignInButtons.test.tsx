import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SocialSignInButtons } from './SocialSignInButtons';

describe('SocialSignInButtons', () => {
  it('renders a button for each provider with the default action label', () => {
    render(<SocialSignInButtons />);

    expect(screen.getByLabelText(/sign in with google/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sign in with apple/i)).toBeInTheDocument();
  });

  it('uses the supplied action label in each button', () => {
    render(<SocialSignInButtons actionLabel="Sign up" />);

    expect(screen.getByLabelText(/sign up with google/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sign up with apple/i)).toBeInTheDocument();
  });

  it('shows the email divider by default and hides it when disabled', () => {
    const { rerender } = render(<SocialSignInButtons />);
    expect(screen.getByText(/or continue with email/i)).toBeInTheDocument();

    rerender(<SocialSignInButtons showDivider={false} />);
    expect(screen.queryByText(/or continue with email/i)).not.toBeInTheDocument();
  });

  it('invokes the callback with the chosen provider and shows no stub notice', async () => {
    const onProviderSelected = vi.fn();
    render(<SocialSignInButtons onProviderSelected={onProviderSelected} />);

    await userEvent.click(screen.getByLabelText(/sign in with google/i));

    expect(onProviderSelected).toHaveBeenCalledWith('google');
    expect(screen.queryByText(/dev placeholder\./i)).not.toBeInTheDocument();
  });

  it('shows a Google dev-stub notice when no callback is supplied', async () => {
    render(<SocialSignInButtons />);

    await userEvent.click(screen.getByLabelText(/sign in with google/i));

    expect(screen.getByText(/Google sign-in is a dev placeholder/i)).toBeInTheDocument();
  });

  it('shows an Apple dev-stub notice when no callback is supplied', async () => {
    render(<SocialSignInButtons />);

    await userEvent.click(screen.getByLabelText(/sign in with apple/i));

    expect(screen.getByText(/Apple sign-in is a dev placeholder/i)).toBeInTheDocument();
  });
});
