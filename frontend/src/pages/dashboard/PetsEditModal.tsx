import { FormInput, TextInput } from '@adoptdontshop/components'
import { PetRescue, PetsService } from '@adoptdontshop/libs/pets'
import React, { useState } from 'react'
import styled from 'styled-components'

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
`

const ModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 100%;
`

const ModalHeader = styled.h2`
  margin-top: 0;
`

const SaveButton = styled.button`
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
`

const EditPetModal: React.FC<{ pet: PetRescue; onClose: () => void }> = ({
  pet,
  onClose,
}) => {
  const [name, setName] = useState(pet.name)
  const [type, setType] = useState(pet.type)
  const [status, setStatus] = useState(pet.status)

  const handleSave = async () => {
    try {
      await PetsService.updatePet(pet.pet_id, { name, type, status })
      onClose()
    } catch (error) {
      console.error('Failed to update pet:', error)
    }
  }

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>Edit Pet</ModalHeader>
        <FormInput label="Name">
          <TextInput
            onChange={(e) => setName(e.target.value)}
            type="text"
            value={name}
          />
        </FormInput>
        <FormInput label="Type">
          <TextInput
            onChange={(e) => setType(e.target.value)}
            type="text"
            value={type}
          />
        </FormInput>
        <FormInput label="Status">
          <TextInput
            onChange={(e) => setStatus(e.target.value)}
            type="text"
            value={status}
          />
        </FormInput>
        <SaveButton onClick={handleSave}>Save</SaveButton>
      </ModalContent>
    </ModalOverlay>
  )
}

export default EditPetModal
