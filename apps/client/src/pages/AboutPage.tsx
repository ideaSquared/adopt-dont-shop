import React from 'react';
import { Container, PageHeader } from '@adopt-dont-shop/lib.components';

/**
 * ADS-1326: the footer links to /about, which had no route (404). Content
 * summarises the platform description in the repo README.
 */
export const AboutPage: React.FC = () => (
  <Container>
    <PageHeader title={<>About Adopt Don&apos;t Shop</>} />
    <p>
      Adopt Don&apos;t Shop connects rescue organizations with potential adopters. Rescues list pets
      that need a home, and adopters can browse, favourite, and apply to adopt them — all in one
      place.
    </p>
    <p>
      We built the platform to make the adoption process clearer and faster for everyone involved:
      rescues get tools to manage listings, applications, and their team; adopters get a
      straightforward way to find a pet and follow their application through to approval.
    </p>
  </Container>
);
