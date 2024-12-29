import {
  Badge,
  Button,
  FormInput,
  ImageGallery,
  Modal,
  SelectInput,
  TextInput,
} from '@adoptdontshop/components'
import { PetRescue, PetsService } from '@adoptdontshop/libs/pets'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

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

const PetImage = styled.img`
  width: 100%;
  height: auto;
  border-radius: 8px;
  margin-bottom: 1rem;
`

const PetDescription = styled.p`
  font-size: 0.9rem;
  color: #666;
`

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`

const Pets: React.FC<{ isAdminView?: boolean }> = ({ isAdminView = false }) => {
  const [pets, setPets] = useState<PetRescue[]>([])
  const [filteredPets, setFilteredPets] = useState<PetRescue[]>([])
  const [searchTerm, setSearchTerm] = useState<string | null>(null)
  const [filterByType, setFilterByType] = useState<string | null>(null)
  const [filterByStatus, setFilterByStatus] = useState<string | null>(null)
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
      // Optimistically remove the pet from the state
      setPets((prevPets) => prevPets.filter((pet) => pet.pet_id !== petId))
      setFilteredPets((prevFilteredPets) =>
        prevFilteredPets.filter((pet) => pet.pet_id !== petId),
      )

      try {
        // Confirm deletion with the server
        await PetsService.deletePet(petId)
      } catch (error) {
        console.error('Error deleting pet:', error)
        alert('Failed to delete the pet. Rolling back changes.')

        // Rollback the deletion if the API call fails
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

  const fetchPetImages = async (petId: string) => {
    try {
      const petImages = await PetsService.fetchPetImages(petId)
      setImages(petImages)
    } catch (error) {
      console.error('Error fetching pet images:', error)
    }
  }

  return (
    <Container>
      <h1>{isAdminView ? 'All Pets (Admin)' : 'Pets'}</h1>
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
      {isEditModalOpen && (
        <Modal
          title="Edit Pet"
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          size="large"
        >
          <ImageGallery
            viewMode="gallery"
            images={images}
            onUpload={(files) => handleImageUpload([files])}
            onDelete={(imageId) => handleImageDelete(imageId, petId)}
          />
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
          <Button type="button" variant="success" onClick={handleSave}>
            Save
          </Button>
        </Modal>
      )}
    </Container>
  )
}

export default Pets
