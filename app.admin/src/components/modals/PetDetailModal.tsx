import React from 'react';
import { Modal, Heading, Text } from '@adopt-dont-shop/lib.components';
import { formatDisplayDate } from '@adopt-dont-shop/lib.utils';
import type { AdminPet } from '@/services/petService';
import * as styles from './PetDetailModal.css';

type PetDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  pet: AdminPet | null;
};

const formatDate = (value?: string) => {
  if (!value) {
    return '—';
  }
  return formatDisplayDate(value, { includeTime: true });
};

export const PetDetailModal: React.FC<PetDetailModalProps> = ({ isOpen, onClose, pet }) => {
  if (!pet) {
    return null;
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Pet: ${pet.name}`}>
      <div className={styles.container}>
        <section>
          <Heading level='h3'>Overview</Heading>
          <dl className={styles.detailGrid}>
            <dt>
              <Text>ID</Text>
            </dt>
            <dd>
              <Text>{pet.petId}</Text>
            </dd>
            <dt>
              <Text>Name</Text>
            </dt>
            <dd>
              <Text>{pet.name}</Text>
            </dd>
            <dt>
              <Text>Type</Text>
            </dt>
            <dd>
              <Text>{pet.type}</Text>
            </dd>
            <dt>
              <Text>Breed</Text>
            </dt>
            <dd>
              <Text>{pet.breed}</Text>
            </dd>
            <dt>
              <Text>Status</Text>
            </dt>
            <dd>
              <Text>{pet.status}</Text>
            </dd>
            <dt>
              <Text>Archived</Text>
            </dt>
            <dd>
              <Text>{pet.archived ? 'Yes' : 'No'}</Text>
            </dd>
            <dt>
              <Text>Featured</Text>
            </dt>
            <dd>
              <Text>{pet.featured ? 'Yes' : 'No'}</Text>
            </dd>
          </dl>
        </section>

        <section>
          <Heading level='h3'>Rescue</Heading>
          <dl className={styles.detailGrid}>
            <dt>
              <Text>Rescue</Text>
            </dt>
            <dd>
              <Text>{pet.rescueName ?? pet.rescueId}</Text>
            </dd>
            <dt>
              <Text>Created</Text>
            </dt>
            <dd>
              <Text>{formatDate(pet.createdAt)}</Text>
            </dd>
            <dt>
              <Text>Updated</Text>
            </dt>
            <dd>
              <Text>{formatDate(pet.updatedAt)}</Text>
            </dd>
          </dl>
        </section>
      </div>
    </Modal>
  );
};

export default PetDetailModal;
