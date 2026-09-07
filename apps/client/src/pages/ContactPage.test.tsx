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
});
