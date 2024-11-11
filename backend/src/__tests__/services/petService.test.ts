import Pet from '../../Models/Pet'
import * as PetService from '../../services/petService'

jest.mock('../../Models/Pet')

describe('PetService', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch all pets', async () => {
    const mockPets = [
      { pet_id: '1', name: 'Pet 1' },
      { pet_id: '2', name: 'Pet 2' },
    ]
    ;(Pet.findAll as jest.Mock).mockResolvedValue(mockPets)

    const pets = await PetService.getAllPets()
    expect(pets).toEqual(mockPets)
    expect(Pet.findAll).toHaveBeenCalledTimes(1)
  })

  it('should fetch pet by id', async () => {
    const mockPet = { pet_id: '1', name: 'Pet 1' }
    ;(Pet.findByPk as jest.Mock).mockResolvedValue(mockPet)

    const pet = await PetService.getPetById('1')
    expect(pet).toEqual(mockPet)
    expect(Pet.findByPk).toHaveBeenCalledWith('1')
  })

  it('should create a pet', async () => {
    const petData = { name: 'New Pet' }
    const mockPet = { pet_id: '1', ...petData }
    ;(Pet.create as jest.Mock).mockResolvedValue(mockPet)

    const pet = await PetService.createPet(petData)
    expect(pet).toEqual(mockPet)
    expect(Pet.create).toHaveBeenCalledWith(petData)
  })

  it('should update a pet', async () => {
    const petData = { name: 'Updated Pet' }
    const mockPet = {
      pet_id: '1',
      update: jest.fn().mockResolvedValue({ ...petData }),
    }
    ;(Pet.findByPk as jest.Mock).mockResolvedValue(mockPet)

    const pet = await PetService.updatePet('1', petData)
    expect(mockPet.update).toHaveBeenCalledWith(petData)
    expect(pet).toEqual(mockPet)
  })

  it('should delete a pet', async () => {
    ;(Pet.destroy as jest.Mock).mockResolvedValue(1)

    const deleted = await PetService.deletePet('1')
    expect(deleted).toBe(true)
    expect(Pet.destroy).toHaveBeenCalledWith({ where: { pet_id: '1' } })
  })
})
