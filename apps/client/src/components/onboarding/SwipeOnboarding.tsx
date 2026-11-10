import React, { useEffect, useState } from 'react';
import { ArrowRight, Hand, Heart, Info } from 'lucide-react';
import { Button, Modal } from '@adopt-dont-shop/lib.components';
import { Link } from 'react-router';
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

  return (
    <Modal isOpen={show} onClose={handleClose} size='md' title='Meet Your New Favourite Feature'>
      <div className={styles.modalContent}>
        <div className={styles.iconContainer}>
          <div className={styles.swipeIcon}>
            <Hand size='1em' />
          </div>
        </div>

        <div className={styles.subtitle}>
          Swipe through adoptable pets matched to your preferences. It&apos;s fast, fun, and a
          better way to browse.
        </div>

        <div className={styles.features}>
          <div className={styles.feature}>
            <ArrowRight size='1em' className='icon' />
            <div className='content'>
              <div className='title'>Swipe Right to Like</div>
              <div className='desc'>Found a cutie? Swipe right to add them to your favourites!</div>
            </div>
          </div>

          <div className={styles.feature}>
            <Heart size='1em' className='icon' />
            <div className='content'>
              <div className='title'>Smart Matching</div>
              <div className='desc'>
                Our algorithm learns your preferences to show better matches
              </div>
            </div>
          </div>

          <div className={styles.feature}>
            <Info size='1em' className='icon' />
            <div className='content'>
              <div className='title'>Quick Info</div>
              <div className='desc'>Swipe down to see more details about any pet</div>
            </div>
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <Link className={styles.primaryButton} to='/discover' onClick={handleStartSwiping}>
            <Hand size='1em' />
            Start Swiping
          </Link>
          <Button variant='outline' isRounded onClick={handleClose}>
            Maybe Later
          </Button>
        </div>
      </div>
    </Modal>
  );
};
