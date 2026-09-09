import React from 'react';
import { Container } from '@adopt-dont-shop/lib.components';

/**
 * ADS-1326: the footer links to /contact, which had no route (404).
 * Addresses come from SECURITY.md (general contact) and docs/legal/terms.md
 * (legal-specific contact) — the only contact addresses documented anywhere
 * in the repo, so this page doesn't invent a new one.
 */
export const ContactPage: React.FC = () => (
  <Container>
    <h1>Contact Us</h1>
    <p>
      For general enquiries, including account or platform issues, email{' '}
      <a href='mailto:privacy@adoptdontshop.app'>privacy@adoptdontshop.app</a>.
    </p>
    <p>
      For questions about our <a href='/terms'>Terms of Service</a>, email{' '}
      <a href='mailto:legal@adoptdontshop.app'>legal@adoptdontshop.app</a>.
    </p>
    <p>
      If you&apos;re a rescue organization interested in listing pets with us, reach out via the
      general contact address above and we&apos;ll get you set up.
    </p>
  </Container>
);
