import React from 'react';
import { Link } from 'react-router';
import * as styles from './DiscoverySearchToggle.css';

type BrowseMode = 'discover' | 'search';

interface DiscoverySearchToggleProps {
  active: BrowseMode;
  className?: string;
}

/**
 * ADS-C2: `/discover` (swipe) and `/search` (filters) are two views of the same
 * "find a pet" task. Rather than merge them, this segmented control makes the
 * relationship explicit and lets the user switch between the two surfaces from
 * either page. The active surface is a non-link marked `aria-current="page"`;
 * the other is a Link.
 */
export const DiscoverySearchToggle: React.FC<DiscoverySearchToggleProps> = ({
  active,
  className,
}) => (
  <nav className={`${styles.toggle}${className ? ` ${className}` : ''}`} aria-label='Browse mode'>
    {active === 'discover' ? (
      <span className={styles.option({ active: true })} aria-current='page'>
        <span aria-hidden='true'>🔥</span> Discover
      </span>
    ) : (
      <Link to='/discover' className={styles.option({ active: false })}>
        <span aria-hidden='true'>🔥</span> Discover
      </Link>
    )}

    {active === 'search' ? (
      <span className={styles.option({ active: true })} aria-current='page'>
        <span aria-hidden='true'>🔎</span> Search
      </span>
    ) : (
      <Link to='/search' className={styles.option({ active: false })}>
        <span aria-hidden='true'>🔎</span> Search
      </Link>
    )}
  </nav>
);
