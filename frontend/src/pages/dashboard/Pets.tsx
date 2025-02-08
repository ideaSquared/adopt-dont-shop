import {
  Badge,
  Button,
  FilterConfig,
  FormInput,
  GenericFilters,
  ImageGallery,
  Modal,
  TextInput,
} from '@adoptdontshop/components'
import { PetRescue, PetsService } from '@adoptdontshop/libs/pets'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

// Style definitions
const Container = styled.div`
  padding: 1rem;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;

  @media (max-width: 768px) {
    padding: 0.5rem;
  }
`

const Title = styled.h1`
  margin-bottom: 2rem;
  font-size: 1.8rem;

  @media (max-width: 768px) {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
`

const PetsGrid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  max-width: 100%;
  overflow-x: hidden;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`

const PetCard = styled.div`
  border: 1px solid ${(props) => props.theme.border.color.default};
  background-color: ${(props) => props.theme.background.content};
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    padding: 0.75rem;
  }
`

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
  }
`

const PetName = styled.h3`
  margin: 0;
  font-size: 1.2rem;

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`

const PetDescription = styled.p`
  font-size: 0.9rem;
  color: ${(props) => props.theme.text.body};
`

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    width: 100%;

    button {
      flex: 1;
    }
  }
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
  const [petId, setPetId] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [age, setAge] = useState<number>(0)
  const [gender, setGender] = useState('')
  const [breed, setBreed] = useState('')
  const [vaccinationStatus, setVaccinationStatus] = useState('')
  const [temperament, setTemperament] = useState('')
  const [health, setHealth] = useState('')
  const [size, setSize] = useState('')
  const [groomingNeeds, setGroomingNeeds] = useState('')
  const [trainingSocialization, setTrainingSocialization] = useState('')
  const [commitmentLevel, setCommitmentLevel] = useState('')
  const [otherPets, setOtherPets] = useState('')
  const [household, setHousehold] = useState('')
  const [energy, setEnergy] = useState('')
  const [family, setFamily] = useState('')
  const [images, setImages] = useState<string[]>([])
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

  const handleEdit = async (pet: PetRescue) => {
    setSelectedPet(pet)
    setPetId(pet.pet_id)
    setName(pet.name)
    setType(pet.type)
    setStatus(pet.status)
    setAge(pet.age)
    setGender(pet.gender)
    setBreed(pet.breed)
    setVaccinationStatus(pet.vaccination_status)
    setTemperament(pet.temperament)
    setHealth(pet.health)
    setSize(pet.size)
    setGroomingNeeds(pet.grooming_needs)
    setTrainingSocialization(pet.training_socialization)
    setCommitmentLevel(pet.commitment_level)
    setOtherPets(pet.other_pets)
    setHousehold(pet.household)
    setEnergy(pet.energy)
    setFamily(pet.family)
    setImages(pet.images)
    setIsEditModalOpen(true)
  }

  const handleSave = async () => {
    if (selectedPet) {
      try {
        const updatedPet = await PetsService.updatePet(selectedPet.pet_id, {
          name,
          type,
          status,
          age,
          gender,
          breed,
          vaccination_status: vaccinationStatus,
          temperament,
          health,
          size,
          grooming_needs: groomingNeeds,
          training_socialization: trainingSocialization,
          commitment_level: commitmentLevel,
          other_pets: otherPets,
          household,
          energy,
          family,
          images,
        })
        setPets((prevPets) =>
          prevPets.map((pet) =>
            pet.pet_id === updatedPet.pet_id ? updatedPet : pet,
          ),
        )
        setFilteredPets((prevFilteredPets) =>
          prevFilteredPets.map((pet) =>
            pet.pet_id === updatedPet.pet_id ? updatedPet : pet,
          ),
        )
        setIsEditModalOpen(false)
      } catch (error) {
        console.error('Failed to update pet:', error)
      }
    }
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

  const handleImageUpload = async (files: File[]) => {
    if (selectedPet) {
      try {
        const uploadedImages = await PetsService.addPetImages(
          selectedPet.pet_id,
          files,
        )

        // Prefix the uploaded images with "/uploads/"
        const normalizedImages = uploadedImages.map(
          (image) => `${baseUrl}${image}`,
        )

        // Update the images state with unique entries
        setImages((prevImages) => [
          ...new Set([...prevImages, ...normalizedImages]),
        ])

        // Update the pets array with unique and prefixed images
        setPets((prevPets) =>
          prevPets.map((pet) =>
            pet.pet_id === selectedPet.pet_id
              ? {
                  ...pet,
                  images: [...new Set([...pet.images, ...normalizedImages])],
                }
              : pet,
          ),
        )
      } catch (error) {
        console.error('Error uploading images:', error)
      }
    }
  }

  const handleImageDelete = async (imageId: string, petId: string) => {
    // Optimistically update the local state
    setImages((prevImages) => prevImages.filter((image) => image !== imageId))

    // Update the pet's images array in the `pets` state
    setPets((prevPets) =>
      prevPets.map((pet) =>
        pet.pet_id === petId
          ? {
              ...pet,
              images: pet.images.filter((image) => image !== imageId),
            }
          : pet,
      ),
    )

    try {
      // Attempt to delete the image from the backend
      await PetsService.removePetImage(petId, imageId)

      // Optionally re-fetch the updated pet images to confirm the deletion
      const updatedImages = await PetsService.fetchPetImages(petId)

      // Sync the frontend state with the backend
      setImages(updatedImages.map((image) => `${baseUrl}${image}`))
      setPets((prevPets) =>
        prevPets.map((pet) =>
          pet.pet_id === petId
            ? {
                ...pet,
                images: updatedImages.map((image) => `${baseUrl}${image}`),
              }
            : pet,
        ),
      )
    } catch (error) {
      console.error('Error deleting image:', error)
      alert('Failed to delete the image. The UI will be rolled back.')

      // Rollback the changes on failure
      const updatedImages = await PetsService.fetchPetImages(petId)
      setImages(updatedImages.map((image) => `${baseUrl}${image}`))
      setPets((prevPets) =>
        prevPets.map((pet) =>
          pet.pet_id === petId
            ? {
                ...pet,
                images: updatedImages.map((image) => `${baseUrl}${image}`),
              }
            : pet,
        ),
      )
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
          <div
            style={{
              display: 'grid',
              gap: '1rem',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '1rem',
            }}
          >
            <ImageGallery
              viewMode="gallery"
              images={images}
              onUpload={(files) => handleImageUpload([files])}
              onDelete={(imageId) => handleImageDelete(imageId, petId)}
            />

            <div
              style={{
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              }}
            >
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
              <FormInput label="Age">
                <TextInput
                  onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                  type="number"
                  value={age}
                />
              </FormInput>
              <FormInput label="Gender">
                <TextInput
                  onChange={(e) => setGender(e.target.value)}
                  type="text"
                  value={gender}
                />
              </FormInput>
              <FormInput label="Breed">
                <TextInput
                  onChange={(e) => setBreed(e.target.value)}
                  type="text"
                  value={breed}
                />
              </FormInput>
              <FormInput label="Vaccination Status">
                <TextInput
                  onChange={(e) => setVaccinationStatus(e.target.value)}
                  type="text"
                  value={vaccinationStatus}
                />
              </FormInput>
              <FormInput label="Temperament">
                <TextInput
                  onChange={(e) => setTemperament(e.target.value)}
                  type="text"
                  value={temperament}
                />
              </FormInput>
              <FormInput label="Health">
                <TextInput
                  onChange={(e) => setHealth(e.target.value)}
                  type="text"
                  value={health}
                />
              </FormInput>
              <FormInput label="Size">
                <TextInput
                  onChange={(e) => setSize(e.target.value)}
                  type="text"
                  value={size}
                />
              </FormInput>
              <FormInput label="Grooming Needs">
                <TextInput
                  onChange={(e) => setGroomingNeeds(e.target.value)}
                  type="text"
                  value={groomingNeeds}
                />
              </FormInput>
              <FormInput label="Training & Socialization">
                <TextInput
                  onChange={(e) => setTrainingSocialization(e.target.value)}
                  type="text"
                  value={trainingSocialization}
                />
              </FormInput>
              <FormInput label="Commitment Level">
                <TextInput
                  onChange={(e) => setCommitmentLevel(e.target.value)}
                  type="text"
                  value={commitmentLevel}
                />
              </FormInput>
              <FormInput label="Other Pets">
                <TextInput
                  onChange={(e) => setOtherPets(e.target.value)}
                  type="text"
                  value={otherPets}
                />
              </FormInput>
              <FormInput label="Household">
                <TextInput
                  onChange={(e) => setHousehold(e.target.value)}
                  type="text"
                  value={household}
                />
              </FormInput>
              <FormInput label="Energy">
                <TextInput
                  onChange={(e) => setEnergy(e.target.value)}
                  type="text"
                  value={energy}
                />
              </FormInput>
              <FormInput label="Family">
                <TextInput
                  onChange={(e) => setFamily(e.target.value)}
                  type="text"
                  value={family}
                />
              </FormInput>
            </div>

            <Button
              type="button"
              variant="success"
              onClick={handleSave}
              style={{ marginTop: '1rem' }}
            >
              Save
            </Button>
          </div>
        </Modal>
      )}
    </Container>
  )
}
