import React from 'react';
import { MdAutoFixHigh, MdFlashOn, MdSearch, MdSwipe, MdTrendingUp } from 'react-icons/md';
import { Link } from 'react-router-dom';
import * as styles from './SwipeHero.css';

export const SwipeHero: React.FC = () => {
  return (
    <section className={styles.heroContainer}>
      <div className={styles.heroContent}>
        <div className={styles.swipeBadge}>
          <MdAutoFixHigh className={styles.sparkle} />
          New: AI-Powered Pet Matching
        </div>

        <h1 className={styles.mainHeading}>
          Find Your Perfect
          <br />
          Companion with a Swipe
        </h1>

        <p className={styles.subtitle}>
          Discover amazing pets waiting for their forever home. Our innovative swipe feature uses
          smart matching to help you find the perfect companion based on your preferences and
          lifestyle.
        </p>

        <div className={styles.ctaContainer}>
          <Link className={styles.primaryButton} to='/discover'>
            <MdSwipe className={styles.primaryButtonIcon} />
            Start Swiping Now
          </Link>
          <Link className={styles.secondaryButton} to='/search'>
            <MdSearch />
            Browse All Pets
          </Link>
        </div>

        <div className={styles.featureCards}>
          <div className={styles.featureCard}>
            <MdSwipe className='icon' />
            <h3>Smart Swiping</h3>
            <p>Swipe right to like, left to pass. Our algorithm learns your preferences!</p>
          </div>

          <div className={styles.featureCard}>
            <MdTrendingUp className='icon' />
            <h3>Instant Matching</h3>
            <p>Get matched with pets that fit your lifestyle and preferences in real-time.</p>
          </div>

          <div className={styles.featureCard}>
            <MdFlashOn className='icon' />
            <h3>Quick & Fun</h3>
            <p>Finding your new best friend has never been this easy and entertaining!</p>
          </div>
        </div>
      </div>
    </section>
  );
};
