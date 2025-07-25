import React from 'react';
import { Modal } from '@adopt-dont-shop/components';
import { PetForm } from '../forms/PetForm';
import { CreatePetRequest, UpdatePetRequest, Pet } from '../../services/api/petService';

interface AddPetModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet?: Pet;
  onSubmit: (data: CreatePetRequest | UpdatePetRequest) => void;
  isLoading?: boolean;
}

export const AddPetModal: React.FC<AddPetModalProps> = ({
  isOpen,
  onClose,
  pet,
  onSubmit,
  isLoading = false,
}) => {
  const handleSubmit = (data: CreatePetRequest | UpdatePetRequest) => {
    onSubmit(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size='lg' title={pet ? 'Edit Pet' : 'Add New Pet'}>
      <PetForm pet={pet} onSubmit={handleSubmit} onCancel={onClose} isLoading={isLoading} />
    </Modal>
  );
};
