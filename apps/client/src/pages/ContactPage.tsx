import React from 'react';
import { HeartHandshake, Mail, Scale } from 'lucide-react';
import { Link } from 'react-router';
import { Container, PageHeader } from '@adopt-dont-shop/lib.components';
import * as styles from './info-page.css';

/**
 * ADS-1326: the footer links to /contact, which had no route (404).
 * Addresses come from SECURITY.md (general contact) and docs/legal/terms.md
 * (legal-specific contact) — the only contact addresses documented anywhere
 * in the repo, so this page doesn't invent a new one.
 */
export const ContactPage: React.FC = () => (
  <Container className={styles.page}>
    <PageHeader
      title='Contact Us'
      description='Choose the address that best fits your question and we’ll get back to you.'
    />

    <div className={styles.cardGrid}>
      <section className={styles.card} aria-labelledby='contact-general'>
        <span className={styles.iconBadge} aria-hidden='true'>
          <Mail size='1em' />
        </span>
        <h2 id='contact-general' className={styles.cardTitle}>
          General enquiries
        </h2>
        <p className={styles.cardText}>Questions about your account or the platform.</p>
        <a href='mailto:privacy@adoptdontshop.app' className={styles.link}>
          privacy@adoptdontshop.app
        </a>
      </section>

      <section className={styles.card} aria-labelledby='contact-legal'>
        <span className={styles.iconBadge} aria-hidden='true'>
          <Scale size='1em' />
        </span>
        <h2 id='contact-legal' className={styles.cardTitle}>
          Legal questions
        </h2>
        <p className={styles.cardText}>
          Questions about our{' '}
          <Link to='/terms' className={styles.link}>
            Terms of Service
          </Link>
          .
        </p>
        <a href='mailto:legal@adoptdontshop.app' className={styles.link}>
          legal@adoptdontshop.app
        </a>
      </section>

      <section className={styles.card} aria-labelledby='contact-rescues'>
        <span className={styles.iconBadge} aria-hidden='true'>
          <HeartHandshake size='1em' />
        </span>
        <h2 id='contact-rescues' className={styles.cardTitle}>
          Rescue organisations
        </h2>
        <p className={styles.cardText}>
          Interested in listing pets with us? Email the general address and we&apos;ll get you set
          up.
        </p>
      </section>
    </div>

    <p className={styles.bodyText}>
      Looking for a quick answer? Try the{' '}
      <Link to='/help' className={styles.link}>
        Help Center
      </Link>
      .
    </p>
  </Container>
);
