import React from 'react';
import { Modal, Heading, Text } from '@adopt-dont-shop/lib.components';
import { applicationStatusLabel } from '@adopt-dont-shop/lib.types';
import type { AdminApplication } from '@/services/applicationService';
import * as styles from './ApplicationDetailModal.css';

type ApplicationDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  application: AdminApplication | null;
};

const formatDate = (value?: string) => {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString('en-GB');
};

export const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
  isOpen,
  onClose,
  application,
}) => {
  if (!application) {
    return null;
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Application ${application.applicationId}`}>
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
    </Modal>
  );
};

export default ApplicationDetailModal;
