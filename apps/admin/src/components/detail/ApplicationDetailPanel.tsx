import React from 'react';
import {
  Heading,
  Text,
  EntityInspector,
  Spinner,
  type EntityInspectorTab,
} from '@adopt-dont-shop/lib.components';
import { applicationStatusLabel } from '@adopt-dont-shop/lib.types';
import { formatDisplayDate } from '@adopt-dont-shop/lib.utils';
import type { AdminApplication } from '@/services/applicationService';
import { useEntityActivity } from '../../hooks';
import * as styles from './ApplicationDetailPanel.css';

type ApplicationDetailPanelProps = {
  application: AdminApplication;
  onClose: () => void;
};

const formatDate = (value?: string) => {
  if (!value) {
    return '—';
  }
  return formatDisplayDate(value, { includeTime: true });
};

// ── Overview tab ────────────────────────────────────────────────

const OverviewTab: React.FC<{ application: AdminApplication }> = ({ application }) => (
  <div className={styles.container}>
    <section>
      <Heading level='h3'>Status</Heading>
      <Text>{applicationStatusLabel(application.status)}</Text>
    </section>

    <section>
      <Heading level='h3'>Applicant</Heading>
      <dl className={styles.detailGrid}>
        <dt>
          <Text>Name</Text>
        </dt>
        <dd>
          <Text>{application.applicantName || '—'}</Text>
        </dd>
        <dt>
          <Text>Email</Text>
        </dt>
        <dd>
          <Text>{application.applicantEmail || '—'}</Text>
        </dd>
      </dl>
    </section>

    <section>
      <Heading level='h3'>Pet</Heading>
      <dl className={styles.detailGrid}>
        <dt>
          <Text>Name</Text>
        </dt>
        <dd>
          <Text>{application.petName}</Text>
        </dd>
        <dt>
          <Text>Type</Text>
        </dt>
        <dd>
          <Text>{application.petType ?? '—'}</Text>
        </dd>
        <dt>
          <Text>ID</Text>
        </dt>
        <dd>
          <Text>{application.petId}</Text>
        </dd>
      </dl>
    </section>

    <section>
      <Heading level='h3'>Rescue</Heading>
      <dl className={styles.detailGrid}>
        <dt>
          <Text>Name</Text>
        </dt>
        <dd>
          <Text>{application.rescueName}</Text>
        </dd>
        <dt>
          <Text>ID</Text>
        </dt>
        <dd>
          <Text>{application.rescueId}</Text>
        </dd>
      </dl>
    </section>

    <section>
      <Heading level='h3'>Timestamps</Heading>
      <dl className={styles.detailGrid}>
        <dt>
          <Text>Created</Text>
        </dt>
        <dd>
          <Text>{formatDate(application.createdAt)}</Text>
        </dd>
        <dt>
          <Text>Updated</Text>
        </dt>
        <dd>
          <Text>{formatDate(application.updatedAt)}</Text>
        </dd>
      </dl>
    </section>
  </div>
);

// ── Activity tab ───────────────────────────────────────────────

const ActivityTab: React.FC<{ applicationId: string }> = ({ applicationId }) => {
  const { data, isLoading, error } = useEntityActivity('application', applicationId);

  if (isLoading) {
    return (
      <div className={styles.activityEmpty}>
        <Spinner size='sm' label='Loading activity' />
      </div>
    );
  }

  if (error) {
    return <div className={styles.activityEmpty}>Failed to load activity history.</div>;
  }

  const activities = data ?? [];

  if (activities.length === 0) {
    return <div className={styles.activityEmpty}>No activity recorded for this application.</div>;
  }

  return (
    <div className={styles.activityList}>
      {activities.map(activity => (
        <div key={activity.activityId} className={styles.activityItem}>
          <div className={styles.activityDot} />
          <div className={styles.activityContent}>
            <p className={styles.activityDescription}>{activity.description}</p>
            <p className={styles.activityMeta}>
              {activity.activityType} &middot;{' '}
              {new Date(activity.createdAt).toLocaleString('en-GB')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Main Panel ─────────────────────────────────────────────────

export const ApplicationDetailPanel: React.FC<ApplicationDetailPanelProps> = ({
  application,
  onClose,
}) => {
  const tabs: EntityInspectorTab[] = [
    {
      id: 'overview',
      label: 'Overview',
      content: <OverviewTab application={application} />,
    },
    {
      id: 'activity',
      label: 'Activity',
      content: <ActivityTab applicationId={application.applicationId} />,
    },
  ];

  return (
    <EntityInspector
      data-testid='application-detail-panel'
      resetTabsOnKeyChange={application.applicationId}
      onClose={onClose}
      closeLabel='Close application detail'
      tabs={tabs}
      header={
        <div className={styles.headerInfo}>
          <h3 className={styles.headerTitle}>
            {application.petName || 'Application'}
            {application.applicantName ? ` — ${application.applicantName}` : ''}
          </h3>
          <p className={styles.headerSubtitle}>
            {applicationStatusLabel(application.status)} &middot; {application.applicationId}
          </p>
        </div>
      }
    />
  );
};
