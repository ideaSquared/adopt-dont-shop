import React, { useEffect, useState } from 'react';
import { MdArrowForward, MdClose, MdFavorite, MdInfo, MdSwipe } from 'react-icons/md';
import { Link } from 'react-router-dom';
import * as styles from './SwipeOnboarding.css';

interface SwipeOnboardingProps {
  onClose: () => void;
}

export const SwipeOnboarding: React.FC<SwipeOnboardingProps> = ({ onClose }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding before
    const hasSeenOnboarding = localStorage.getItem('hasSeenSwipeOnboarding');

    if (!hasSeenOnboarding) {
      // Show after a short delay
      const timer = setTimeout(() => {
        setShow(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setShow(false);
    localStorage.setItem('hasSeenSwipeOnboarding', 'true');
    onClose();
  };

  const handleStartSwiping = () => {
    localStorage.setItem('hasSeenSwipeOnboarding', 'true');
    onClose();
  };

  if (!show) {
    return null;
  }

  return (
    <div
      className={styles.overlay({ show: true })}
      onClick={handleClose}
      role='button'
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          handleClose();
        }
      }}
    >
      <div className={styles.modalContent} onClick={e => e.stopPropagation()} role='presentation'>
        <button className={styles.closeButton} onClick={handleClose} aria-label='Close'>
          <MdClose />
        </button>

        <div className={styles.iconContainer}>
          <div className={styles.swipeIcon}>
            <MdSwipe />
          </div>
        </div>

        <div className={styles.title}>Meet Your New Favorite Feature!</div>
        <div className={styles.subtitle}>
          Swipe through adorable pets and find your perfect match in seconds. It&apos;s fast, fun,
          and incredibly effective!
        </div>

        <div className={styles.features}>
          <div className={styles.feature}>
            <MdArrowForward className='icon' />
            <div className='content'>
              <div className='title'>Swipe Right to Like</div>
              <div className='desc'>Found a cutie? Swipe right to add them to your favorites!</div>
            </div>
          </div>

          <div className={styles.feature}>
            <MdFavorite className='icon' />
            <div className='content'>
              <div className='title'>Smart Matching</div>
              <div className='desc'>
                Our algorithm learns your preferences to show better matches
              </div>
            </div>
          </div>

          <div className={styles.feature}>
            <MdInfo className='icon' />
            <div className='content'>
              <div className='title'>Quick Info</div>
              <div className='desc'>Swipe down to see more details about any pet</div>
            </div>
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <Link className={styles.primaryButton} to='/discover' onClick={handleStartSwiping}>
            <MdSwipe />
            Start Swiping
          </Link>
          <button className={styles.secondaryButton} onClick={handleClose}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};
