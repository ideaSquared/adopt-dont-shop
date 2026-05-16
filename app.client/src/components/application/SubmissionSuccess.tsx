import React from 'react';
import { Button } from '@adopt-dont-shop/lib.components';
import * as styles from './SubmissionSuccess.css';

type SubmissionSuccessProps = {
  petName: string;
  rescueName: string;
  email: string;
  applicationId: string;
  onViewApplication: () => void;
  onViewAllApplications: () => void;
};

export const SubmissionSuccess: React.FC<SubmissionSuccessProps> = ({
  petName,
  rescueName,
  email,
  onViewApplication,
  onViewAllApplications,
}) => (
  <section className={styles.container} aria-labelledby='submission-success-heading'>
    <h2 id='submission-success-heading' className={styles.heading}>
      Application sent! 🎉
    </h2>
    <p className={styles.intro}>
      Your application for {petName} is now with {rescueName}.
    </p>
    <ul className={styles.nextSteps}>
      <li className={styles.nextStepItem}>
        We&apos;ve emailed a confirmation to <strong>{email}</strong> — keep an eye on your inbox
        (and the spam folder, just in case).
      </li>
      <li className={styles.nextStepItem}>
        {rescueName} typically responds within a few days. If they need more information
        they&apos;ll reach out through your messages here.
      </li>
      <li className={styles.nextStepItem}>
        You can track this application — and anything else you&apos;ve sent — from your applications
        dashboard at any time.
      </li>
    </ul>
    <div className={styles.actions}>
      <Button variant='secondary' onClick={onViewAllApplications}>
        View all applications
      </Button>
      <Button variant='primary' onClick={onViewApplication}>
        View my application
      </Button>
    </div>
  </section>
);
