import React from 'react';
import { Modal, Heading, Text } from '@adopt-dont-shop/lib.components';
import type { AdminPet } from '@/services/petService';

type PetDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  pet: AdminPet | null;
};

const formatDate = (value?: string) => {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString('en-GB');
};

export const PetDetailModal: React.FC<PetDetailModalProps> = ({ isOpen, onClose, pet }) => {
  if (!pet) {
    return null;
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Pet: ${pet.name}`}>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <section>
          <Heading level='h3'>Overview</Heading>
          <dl style={{ display: 'grid', gridTemplateColumns: '8rem 1fr', gap: '0.25rem 1rem' }}>
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
          <dl style={{ display: 'grid', gridTemplateColumns: '8rem 1fr', gap: '0.25rem 1rem' }}>
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
