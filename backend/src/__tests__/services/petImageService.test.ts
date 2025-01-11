import { Pet } from '../../Models'
import * as PetService from '../../services/petImageService'

// Mock the Pet model methods
jest.mock('../../Models', () => ({
  Pet: {
    findByPk: jest.fn(),
  },
  PetImage: {
    create: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn(),
  },
  AuditLog: {
    create: jest.fn(),
  },
}))

describe('PetService', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should add pet images', async () => {
    const mockPet = {
      pet_id: '1',
      images: [],
      save: jest.fn().mockResolvedValue(undefined), // Add a save method to the mock instance
    }
    ;(Pet.findByPk as jest.Mock).mockResolvedValue(mockPet) // Mock pet found by ID

    const mockImages = [
      { image_url: 'https://example.com/image1.jpg' },
      { image_url: 'https://example.com/image2.jpg' },
    ]

    const result = await PetService.addPetImages('1', mockImages)
    expect(result).toEqual(mockPet.images) // Should return the updated images array
    expect(Pet.findByPk).toHaveBeenCalledWith('1')
    expect(mockPet.save).toHaveBeenCalledTimes(1) // Ensure save is called on the instance
  })

  it('should fetch pet images', async () => {
    const mockPet = {
      pet_id: '1',
      images: [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ],
    }
    ;(Pet.findByPk as jest.Mock).mockResolvedValue(mockPet) // Mock pet found by ID

    const petImages = await PetService.fetchPetImages('1')
    expect(petImages).toEqual(mockPet.images) // Should return the images array
    expect(Pet.findByPk).toHaveBeenCalledWith('1')
  })

  it('should remove a pet image', async () => {
    const mockPet = {
      pet_id: '1',
      images: [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ],
      save: jest.fn().mockResolvedValue(undefined), // Add a save method to the mock instance
    }
    ;(Pet.findByPk as jest.Mock).mockResolvedValue(mockPet) // Mock pet found by ID

    const imageToRemove = 'https://example.com/image1.jpg'
    const result = await PetService.removePetImage('1', imageToRemove)
    expect(result).toBe(true) // Should return true after image is removed
    expect(mockPet.save).toHaveBeenCalledTimes(1) // Save method should be called once

    // Simulate no image removed
    const noImageToRemove = 'https://example.com/nonexistent.jpg'
    const noDeletionResult = await PetService.removePetImage(
      '1',
      noImageToRemove,
    )
    expect(noDeletionResult).toBe(false) // Should return false if image wasn't found
  })
})
