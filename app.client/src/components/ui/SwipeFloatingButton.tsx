import React, { useEffect, useState } from 'react';
import { MdClose, MdSwipe } from 'react-icons/md';
import { Link, useLocation } from 'react-router-dom';
import * as styles from './SwipeFloatingButton.css';

interface SwipeFloatingButtonProps {
  className?: string;
}

export const SwipeFloatingButton: React.FC<SwipeFloatingButtonProps> = ({ className }) => {
  const location = useLocation();
  const [showCallout, setShowCallout] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Pages where we should show the floating button
  const showOnPages = ['/search', '/pets', '/profile', '/favorites'];
  const shouldShow = showOnPages.some(page => location.pathname.startsWith(page));

  // Don't show on discovery page or if dismissed
  const show = shouldShow && !location.pathname.startsWith('/discover') && !dismissed;

  useEffect(() => {
    // Show callout after a delay if not dismissed
    if (show && !dismissed) {
      const timer = setTimeout(() => {
        setShowCallout(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, dismissed]);

  useEffect(() => {
    // Reset callout when changing pages
    setShowCallout(false);
  }, [location.pathname]);

  const handleDismiss = () => {
    setShowCallout(false);
    setDismissed(true);
    // Store dismissal in localStorage to persist across sessions
    localStorage.setItem('swipeFloatingButtonDismissed', 'true');
  };

  // Check if previously dismissed
  useEffect(() => {
    const wasDismissed = localStorage.getItem('swipeFloatingButtonDismissed');
    if (wasDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  if (!show) {
    return null;
  }

  return (
    <div className={`${styles.floatingContainer({ show })}${className ? ` ${className}` : ''}`}>
      <div className={styles.calloutBubble({ show: showCallout && !dismissed })}>
        <button className={styles.closeButton} onClick={handleDismiss} aria-label='Dismiss'>
          <MdClose />
        </button>
        <h4>Try Swiping! 🐾</h4>
        <p>Discover pets faster with our fun swipe feature</p>
      </div>

      <Link
        to='/discover'
        className={styles.floatingButton}
        aria-label='Start swiping to discover pets'
      >
        <MdSwipe className='icon' />
      </Link>
    </div>
  );
};
