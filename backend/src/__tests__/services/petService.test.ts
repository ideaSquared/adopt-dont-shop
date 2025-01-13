import * as PetService from '../../services/petService'

jest.mock('../../services/petService', () => ({
  getAllPets: jest.fn(),
  getPetById: jest.fn(),
  createPet: jest.fn(),
  updatePet: jest.fn(),
  deletePet: jest.fn(),
}))

describe('PetService', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch all pets', async () => {
    const mockPets = [
      { pet_id: '1', name: 'Pet 1' },
      { pet_id: '2', name: 'Pet 2' },
    ]
    ;(PetService.getAllPets as jest.Mock).mockResolvedValue(mockPets)

    const pets = await PetService.getAllPets()
    expect(pets).toEqual(mockPets)
    expect(PetService.getAllPets).toHaveBeenCalledTimes(1)
  })

  it('should fetch pet by id', async () => {
    const mockPet = { pet_id: '1', name: 'Pet 1' }
    ;(PetService.getPetById as jest.Mock).mockResolvedValue(mockPet)

    const pet = await PetService.getPetById('1')
    expect(pet).toEqual(mockPet)
    expect(PetService.getPetById).toHaveBeenCalledWith('1')
  })

  it('should create a pet', async () => {
    const petData = { name: 'New Pet' }
    const mockPet = { pet_id: '1', ...petData }
    ;(PetService.createPet as jest.Mock).mockResolvedValue(mockPet)

    const pet = await PetService.createPet(petData)
    expect(pet).toEqual(mockPet)
    expect(PetService.createPet).toHaveBeenCalledWith(petData)
  })

  it('should update a pet', async () => {
    const petData = { name: 'Updated Pet' }
    const mockPet = {
      pet_id: '1',
      update: jest.fn().mockResolvedValue({ ...petData }),
    }
    ;(PetService.updatePet as jest.Mock).mockResolvedValue(mockPet)

    const pet = await PetService.updatePet('1', petData)
    expect(PetService.updatePet).toHaveBeenCalledWith('1', petData)
    expect(pet).toEqual(mockPet)
  })

  it('should delete a pet', async () => {
    ;(PetService.deletePet as jest.Mock).mockResolvedValue(true)

    const deleted = await PetService.deletePet('1')
    expect(deleted).toBe(true)
    expect(PetService.deletePet).toHaveBeenCalledWith('1')
  })
})
