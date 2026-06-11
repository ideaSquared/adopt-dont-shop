import React from 'react';
import { MdAutoFixHigh, MdFlashOn, MdSearch, MdSwipe, MdTrendingUp } from 'react-icons/md';
import { Link } from 'react-router-dom';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import * as styles from './SwipeHero.css';

export const SwipeHero: React.FC = () => {
  const { trackEvent } = useAnalytics();

  const trackHeroCtaClick = (entryPath: 'discover' | 'search') => {
    trackEvent({
      category: 'homepage',
      action: 'hero_cta_clicked',
      label: entryPath,
      sessionId: 'homepage-session',
      timestamp: new Date(),
      properties: {
        entry_path: entryPath,
        source: 'swipe_hero',
      },
    });
  };

  return (
    <section className={styles.heroContainer}>
      <div className={styles.heroContent}>
        <div className={styles.swipeBadge}>
          <MdAutoFixHigh className={styles.sparkle} />
          New: Smart Pet Matching
        </div>

        <h1 className={styles.mainHeading}>
          Find Your Next
          <br />
          Companion with a Swipe
        </h1>

        <p className={styles.subtitle}>
          Swipe through adoptable pets matched to your preferences and lifestyle. Like the ones that
          catch your eye — we'll connect you with their rescue.
        </p>

        <div className={styles.ctaContainer}>
          <Link
            className={styles.primaryButton}
            to='/discover'
            title='Swipe through matches'
            onClick={() => trackHeroCtaClick('discover')}
          >
            <MdSwipe className={styles.primaryButtonIcon} />
            Start Swiping Now
          </Link>
          <Link
            className={styles.secondaryButton}
            to='/search'
            title='Filter and browse all pets'
            onClick={() => trackHeroCtaClick('search')}
          >
            <MdSearch />
            Browse All Pets
          </Link>
        </div>

        <div className={styles.featureCards}>
          <div className={styles.featureCard}>
            <MdSwipe className='icon' />
            <h3>Smart Swiping</h3>
            <p>Swipe right to like, left to pass. Matches improve as you set more preferences.</p>
          </div>

          <div className={styles.featureCard}>
            <MdTrendingUp className='icon' />
            <h3>Preference Matching</h3>
            <p>See pets that fit your home, lifestyle, and experience level first.</p>
          </div>

          <div className={styles.featureCard}>
            <MdFlashOn className='icon' />
            <h3>Quick & Fun</h3>
            <p>A faster way to browse adoptable pets — no endless scrolling required.</p>
          </div>
        </div>
      </div>
    </section>
  );
};
