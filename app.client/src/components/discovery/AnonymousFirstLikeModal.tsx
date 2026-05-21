import React from 'react';
import { Link } from 'react-router-dom';
import * as styles from './AnonymousFirstLikeModal.css';

export type AnonymousFirstLikeModalProps = {
  petId: string;
  petName: string;
  petImage?: string;
  onDismiss: () => void;
  onCtaClick: () => void;
};

/**
 * ADS-626: shown exactly once per browser session when an anonymous
 * user issues their first "like". The CTA deep-links to /register
 * with a petId query so the registration flow can redirect back to
 * /pets/:id on completion. Dismiss is a no-op against ADS-625's
 * swipe-budget — that counter is decremented in DiscoveryPage's
 * handler, not here.
 */
export const AnonymousFirstLikeModal: React.FC<AnonymousFirstLikeModalProps> = ({
  petId,
  petName,
  petImage,
  onDismiss,
  onCtaClick,
}) => {
  return (
    <div
      className={styles.backdrop}
      role='dialog'
      aria-modal='true'
      aria-labelledby='anon-like-title'
    >
      <div className={styles.card}>
        <button type='button' className={styles.close} aria-label='Dismiss' onClick={onDismiss}>
          ×
        </button>
        {petImage && <img src={petImage} alt={petName} className={styles.image} />}
        <div className={styles.body}>
          <h2 id='anon-like-title' className={styles.title}>
            It&apos;s a Match!
          </h2>
          <p className={styles.subtitle}>You and {petName} could be a match. Sign up to apply.</p>
          <Link
            to={`/register?petId=${encodeURIComponent(petId)}`}
            className={styles.cta}
            onClick={onCtaClick}
          >
            Sign up to apply
          </Link>
        </div>
      </div>
    </div>
  );
};

export const ANON_FIRST_LIKE_FIRED_KEY = 'anon_first_like.fired';
