import React from 'react';
import { House, Search } from 'lucide-react';
import { Link } from 'react-router';
import { Container, PageHeader } from '@adopt-dont-shop/lib.components';
import * as styles from './info-page.css';

/**
 * ADS-1326: the footer links to /about, which had no route (404). Content
 * summarises the platform description in the repo README.
 */
export const AboutPage: React.FC = () => (
  <Container className={styles.page}>
    <PageHeader
      title={<>About Adopt Don&apos;t Shop</>}
      description={
        <span className={styles.lead}>
          Adopt Don&apos;t Shop connects rescue organizations with potential adopters, so every pet
          that needs a home can be found in one place. We built it to make adoption clearer and
          faster for everyone involved.
        </span>
      }
    />

    <div className={styles.cardGrid}>
      <section className={styles.card} aria-labelledby='about-adopters'>
        <span className={styles.iconBadge} aria-hidden='true'>
          <Search size='1em' />
        </span>
        <h2 id='about-adopters' className={styles.cardTitle}>
          For adopters
        </h2>
        <p className={styles.cardText}>
          Browse pets that need a home, favourite the ones you love, and apply to adopt them. Then
          follow your application all the way through to approval.
        </p>
      </section>

      <section className={styles.card} aria-labelledby='about-rescues'>
        <span className={styles.iconBadge} aria-hidden='true'>
          <House size='1em' />
        </span>
        <h2 id='about-rescues' className={styles.cardTitle}>
          For rescues
        </h2>
        <p className={styles.cardText}>
          List the pets in your care and manage your listings, applications, and team with tools
          built for rescue work.
        </p>
      </section>
    </div>

    <section className={styles.callout} aria-labelledby='about-next'>
      <div>
        <h2 id='about-next' className={styles.calloutTitle}>
          Ready to meet your new companion?
        </h2>
        <p className={styles.calloutText}>Start browsing, or get in touch if you have questions.</p>
      </div>
      <div className={styles.actions}>
        <Link to='/search' className={styles.primaryLinkButton}>
          Browse pets
        </Link>
        <Link to='/contact' className={styles.outlineLinkButton}>
          Contact us
        </Link>
      </div>
    </section>
  </Container>
);
