import {
  Badge,
  Button,
  FilterConfig,
  GenericFilters,
  ImageGallery,
  Modal,
} from '@adoptdontshop/components'
import { PetRescue, PetsService } from '@adoptdontshop/libs/pets'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

// Style definitions
const Container = styled.div`
  padding: 1rem;
`

const Title = styled.h1`
  margin-bottom: 2rem;
  font-size: 1.8rem;
`

const PetsGrid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
`

const PetCard = styled.div`
  border: 1px solid ${(props) => props.theme.border.color.default};
  background-color: ${(props) => props.theme.background.content};
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
`

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`

const PetName = styled.h3`
  margin: 0;
  font-size: 1.2rem;
`

const PetDescription = styled.p`
  font-size: 0.9rem;
  color: ${(props) => props.theme.text.body};
`

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`

// Types
type PetsProps = {
  isAdminView?: boolean
}

export const Pets: React.FC<PetsProps> = ({ isAdminView = false }) => {
  const [pets, setPets] = useState<PetRescue[]>([])
  const [filteredPets, setFilteredPets] = useState<PetRescue[]>([])
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    status: 'all',
  })
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedPet, setSelectedPet] = useState<PetRescue | null>(null)
  const baseUrl = 'http://localhost:5000/api/uploads/'

  // Filter configuration
  const filterConfig: FilterConfig[] = [
    {
      name: 'search',
      label: 'Search by pet name',
      type: 'text',
      placeholder: 'Enter pet name',
    },
    {
      name: 'type',
      label: 'Filter by type',
      type: 'select',
      options: [
        { value: 'all', label: 'All Types' },
        ...Array.from(new Set(pets.map((pet) => pet.type))).map((type) => ({
          value: type,
          label: type,
        })),
      ],
    },
    {
      name: 'status',
      label: 'Filter by status',
      type: 'select',
      options: [
        { value: 'all', label: 'All Statuses' },
        ...Array.from(new Set(pets.map((pet) => pet.status))).map((status) => ({
          value: status,
          label: status,
        })),
      ],
    },
  ]

  // Fetch pets on component mount
  useEffect(() => {
    const fetchPets = async () => {
      try {
        const fetchedPets = isAdminView
          ? await PetsService.getAllPets()
          : await PetsService.getPetsByRescueId()

        const updatedPets = fetchedPets.map((pet) => ({
          ...pet,
          images: pet.images?.length
            ? pet.images.map((image) => `${baseUrl}${image}`)
            : [],
        }))

        setPets(updatedPets)
        setFilteredPets(updatedPets)
      } catch (error) {
        console.error('Error fetching pets:', error)
      }
    }

    fetchPets()
  }, [isAdminView])

  // Filter pets based on the filters state
  useEffect(() => {
    const filtered = pets.filter((pet) => {
      const matchesSearch =
        !filters.search ||
        pet.name.toLowerCase().includes(filters.search.toLowerCase())
      const matchesType = filters.type === 'all' || pet.type === filters.type
      const matchesStatus =
        filters.status === 'all' || pet.status === filters.status
      return matchesSearch && matchesType && matchesStatus
    })
    setFilteredPets(filtered)
  }, [filters, pets])

  const handleEdit = (pet: PetRescue) => {
    setSelectedPet(pet)
    setIsEditModalOpen(true)
  }

  const handleDelete = async (petId: string) => {
    if (window.confirm('Are you sure you want to delete this pet?')) {
      setPets((prevPets) => prevPets.filter((pet) => pet.pet_id !== petId))
      setFilteredPets((prevFilteredPets) =>
        prevFilteredPets.filter((pet) => pet.pet_id !== petId),
      )

      try {
        await PetsService.deletePet(petId)
      } catch (error) {
        console.error('Error deleting pet:', error)
      }
    }
  }

  return (
    <Container>
      <Title>{isAdminView ? 'All Pets (Admin)' : 'Pets'}</Title>

      <GenericFilters
        filters={filters}
        onFilterChange={(name: string, value: string | boolean) =>
          setFilters((prev) => ({ ...prev, [name]: value }))
        }
        filterConfig={filterConfig}
      />

      <PetsGrid>
        {filteredPets.map((pet) => (
          <PetCard key={pet.pet_id}>
            <CardHeader>
              <PetName>{pet.name}</PetName>
              <Badge>{pet.status}</Badge>
              <ActionButtons>
                <Button
                  type="button"
                  variant="info"
                  onClick={() => handleEdit(pet)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => handleDelete(pet.pet_id)}
                >
                  Delete
                </Button>
              </ActionButtons>
            </CardHeader>
            <ImageGallery viewMode="carousel" images={pet.images} />
            <PetDescription>
              {pet.short_description || 'No description available'}
            </PetDescription>
          </PetCard>
        ))}
      </PetsGrid>

      {isEditModalOpen && selectedPet && (
        <Modal
          title="Edit Pet"
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          size="large"
        >
          <div>Edit form goes here...</div>
        </Modal>
      )}
    </Container>
  )
}
