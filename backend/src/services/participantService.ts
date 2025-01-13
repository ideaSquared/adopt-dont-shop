import Participant from '../Models/Participant'

export const getAllParticipants = async () => {
  return await Participant.findAll()
}

export const getParticipantById = async (id: string) => {
  return await Participant.findByPk(id)
}

export const createParticipant = async (
  participantData: Partial<Participant>,
) => {
  return await Participant.create(participantData)
}
