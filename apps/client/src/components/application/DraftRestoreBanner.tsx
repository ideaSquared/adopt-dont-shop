import React from 'react';
import { Button } from '@adopt-dont-shop/lib.components';
import * as styles from './DraftRestoreBanner.css';

type DraftRestoreBannerProps = {
  savedAt: Date;
  onResume: () => void;
  onStartOver: () => void;
};

const formatSavedAt = (date: Date): string => {
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) {
    return 'just now';
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
};

export const DraftRestoreBanner: React.FC<DraftRestoreBannerProps> = ({
  savedAt,
  onResume,
  onStartOver,
}) => (
  <div className={styles.banner} role='status'>
    <div className={styles.message}>
      <span className={styles.title}>You have a previous draft</span>
      <span className={styles.timestamp}>Saved {formatSavedAt(savedAt)}</span>
    </div>
    <div className={styles.actions}>
      <Button variant='secondary' onClick={onStartOver}>
        Start over
      </Button>
      <Button variant='primary' onClick={onResume}>
        Resume draft
      </Button>
    </div>
  </div>
);
