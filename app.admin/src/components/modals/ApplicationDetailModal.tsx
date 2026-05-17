import React from 'react';
import { Modal, Heading, Text } from '@adopt-dont-shop/lib.components';
import type { AdminApplication } from '@/services/applicationService';

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
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <section>
          <Heading level='h3'>Status</Heading>
          <Text>{application.status}</Text>
        </section>

        <section>
          <Heading level='h3'>Applicant</Heading>
          <dl style={{ display: 'grid', gridTemplateColumns: '8rem 1fr', gap: '0.25rem 1rem' }}>
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
          <dl style={{ display: 'grid', gridTemplateColumns: '8rem 1fr', gap: '0.25rem 1rem' }}>
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
          <dl style={{ display: 'grid', gridTemplateColumns: '8rem 1fr', gap: '0.25rem 1rem' }}>
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
          <dl style={{ display: 'grid', gridTemplateColumns: '8rem 1fr', gap: '0.25rem 1rem' }}>
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
