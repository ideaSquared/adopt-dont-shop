import { FormInput, SelectInput, TextInput } from '@adoptdontshop/components'
import { PetRescue, PetsService } from '@adoptdontshop/libs/pets'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import EditPetModal from './PetsEditModal'

const Container = styled.div`
  padding: 1rem;
`

const PetsGrid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
`

const PetCard = styled.div`
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  background: #fff;
`

const PetImage = styled.img`
  width: 100%;
  height: auto;
  border-radius: 8px;
  margin-bottom: 1rem;
`

const SectionTitle = styled.h4`
  margin-top: 1rem;
  margin-bottom: 0.5rem;
`

const CollapseButton = styled.button`
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  font-size: 0.9rem;
  margin-top: 0.5rem;
`

const CollapsibleContent = styled.div<{ isVisible: boolean }>`
  max-height: ${({ isVisible }) => (isVisible ? '100%' : '0')};
  overflow: hidden;
  transition: max-height 0.3s ease;
`

const ActionButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
`

const EditButton = styled.button`
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
`

const DeleteButton = styled.button`
  background-color: #f44336;
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
`

// Define types for props, including children
interface CollapsibleSectionProps {
  label: string
  children: React.ReactNode
}

const Pets: React.FC = () => {
  const [pets, setPets] = useState<PetRescue[]>([])
  const [filteredPets, setFilteredPets] = useState<PetRescue[]>([])
  const [searchTerm, setSearchTerm] = useState<string | null>(null)
  const [filterByType, setFilterByType] = useState<string | null>(null)
  const [filterByStatus, setFilterByStatus] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedPet, setSelectedPet] = useState<PetRescue | null>(null)

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const fetchedPets = await PetsService.getPets()
        setPets(fetchedPets)
        setFilteredPets(fetchedPets)
      } catch (error) {
        console.error('Error fetching pets:', error)
      }
    }

    fetchPets()
  }, [])

  useEffect(() => {
    const filtered = pets.filter((pet) => {
      const matchesSearch =
        !searchTerm || pet.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = !filterByType || pet.type === filterByType
      const matchesStatus = !filterByStatus || pet.status === filterByStatus
      return matchesSearch && matchesType && matchesStatus
    })
    setFilteredPets(filtered)
  }, [searchTerm, filterByType, filterByStatus, pets])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleFilterTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterByType(e.target.value)
  }

  const handleFilterStatusChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setFilterByStatus(e.target.value)
  }

  const serviceOptions = [
    { value: '', label: 'All types' },
    ...Array.from(new Set(pets.map((pet) => pet.type))).map((type) => ({
      value: type,
      label: type,
    })),
  ]

  const statusOptions = [
    { value: '', label: 'All statuses' },
    ...Array.from(new Set(pets.map((pet) => pet.status))).map((status) => ({
      value: status,
      label: status,
    })),
  ]

  const handleEdit = (pet: PetRescue) => {
    setSelectedPet(pet)
    setIsEditModalOpen(true)
  }

  const handleDelete = async (petId: string) => {
    if (window.confirm('Are you sure you want to delete this pet?')) {
      await PetsService.deletePet(petId) // Assumes PetsService has deletePet method
      setPets(pets.filter((pet) => pet.pet_id !== petId))
    }
  }

  return (
    <Container>
      <h1>Pets</h1>
      <FormInput label="Search by pet name">
        <TextInput
          onChange={handleSearchChange}
          type="text"
          value={searchTerm || ''}
        />
      </FormInput>
      <FormInput label="Filter by type">
        <SelectInput
          onChange={handleFilterTypeChange}
          value={filterByType}
          options={serviceOptions}
        />
      </FormInput>
      <FormInput label="Filter by status">
        <SelectInput
          onChange={handleFilterStatusChange}
          value={filterByStatus}
          options={statusOptions}
        />
      </FormInput>
      <PetsGrid>
        {filteredPets.map((pet) => (
          <PetCard key={pet.pet_id}>
            <ActionButtons>
              <EditButton onClick={() => handleEdit(pet)}>Edit</EditButton>
              <DeleteButton onClick={() => handleDelete(pet.pet_id)}>
                Delete
              </DeleteButton>
            </ActionButtons>
            <PetImage
              src={pet.images?.[0] || 'https://placehold.jp/150x150.png'}
              alt={pet.name}
            />
            <h3>{pet.name}</h3>
            <p>Type: {pet.type}</p>
            <p>Status: {pet.status}</p>
            <SectionTitle>Basic Information</SectionTitle>
            <p>Age: {pet.age} years</p>
            <p>Gender: {pet.gender}</p>
            <p>Breed: {pet.breed}</p>

            <SectionTitle>Health & Care</SectionTitle>
            <p>Vaccination: {pet.vaccination_status}</p>
            <p>Health: {pet.health}</p>
            <p>Grooming Needs: {pet.grooming_needs}</p>

            <CollapsibleSection label="More Details">
              <SectionTitle>Training & Temperament</SectionTitle>
              <p>Temperament: {pet.temperament}</p>
              <p>Training: {pet.training_socialization}</p>

              <SectionTitle>Ratings</SectionTitle>
              {pet.ratings ? (
                <div>
                  <div>Love: {pet.ratings.love}</div>
                  <div>Like: {pet.ratings.like}</div>
                  <div>Dislike: {pet.ratings.dislike}</div>
                </div>
              ) : (
                <p>No Ratings</p>
              )}
              <p>Application Count: {pet.application_count || 0}</p>
            </CollapsibleSection>
          </PetCard>
        ))}
      </PetsGrid>
      {isEditModalOpen && selectedPet && (
        <EditPetModal
          pet={selectedPet}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </Container>
  )
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  label,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const toggleVisibility = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div>
      <CollapseButton onClick={toggleVisibility}>
        {isOpen ? `Hide ${label}` : `Show ${label}`}
      </CollapseButton>
      <CollapsibleContent isVisible={isOpen}>{children}</CollapsibleContent>
    </div>
  )
}

export default Pets
