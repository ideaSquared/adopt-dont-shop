import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../test-utils';
import { ContactPage } from './ContactPage';

describe('ContactPage', () => {
  it('renders the Contact heading and a mailto link for general enquiries', () => {
    renderWithProviders(<ContactPage />);

    expect(screen.getByRole('heading', { name: /contact us/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'privacy@adoptdontshop.app' })).toHaveAttribute(
      'href',
      'mailto:privacy@adoptdontshop.app'
    );
  });

  it('lists each way to get in touch under its own heading', () => {
    renderWithProviders(<ContactPage />);

    expect(screen.getByRole('heading', { name: /general enquiries/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /legal questions/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /rescue organisations/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'legal@adoptdontshop.app' })).toHaveAttribute(
      'href',
      'mailto:legal@adoptdontshop.app'
    );
  });

  it('links to the Terms of Service and the Help Center', () => {
    renderWithProviders(<ContactPage />);

    expect(screen.getByRole('link', { name: /terms of service/i })).toHaveAttribute(
      'href',
      '/terms'
    );
    expect(screen.getByRole('link', { name: /help center/i })).toHaveAttribute('href', '/help');
  });
});
