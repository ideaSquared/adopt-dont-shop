import { Application } from './Application'

const applications: Application[] = [
  {
    application_id: '1',
    first_name: 'John',
    pet_id: '101',
    pet_name: 'Max',
    description: 'Adoption application for Max',
    status: 'pending',
    actioned_by: null,
  },
  {
    application_id: '2',
    first_name: 'Jane',
    pet_id: '102',
    pet_name: 'Bella',
    description: 'Adoption application for Bella',
    status: 'approved',
    actioned_by: 'admin1',
  },
]

const getApplications = (): Application[] => applications

const getApplicationById = (id: string): Application | undefined =>
  applications.find((application) => application.application_id === id)

export default {
  getApplications,
  getApplicationById,
}
