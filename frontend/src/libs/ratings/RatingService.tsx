import { Rating, RatingType } from './Ratings'

const ratings: Rating[] = [
  {
    pet_id: 'pet_001',
    user_id: 'user_001',
    type: 'LIKE',
    timestamp: new Date('2024-08-01T10:20:30Z'),
  },
  {
    pet_id: 'pet_002',
    user_id: 'user_002',
    type: 'LOVE',
    timestamp: new Date('2024-08-02T11:21:31Z'),
  },
  {
    pet_id: 'pet_003',
    user_id: 'user_003',
    type: 'DISLIKE',
    timestamp: new Date('2024-08-03T12:22:32Z'),
  },
  {
    pet_id: 'pet_004',
    user_id: 'user_004',
    type: 'LIKE',
    timestamp: new Date('2024-08-04T13:23:33Z'),
  },
  {
    pet_id: 'pet_005',
    user_id: 'user_005',
    type: 'LOVE',
    timestamp: new Date('2024-08-05T14:24:34Z'),
  },
  {
    pet_id: 'pet_006',
    user_id: 'user_006',
    type: 'DISLIKE',
    timestamp: new Date('2024-08-06T15:25:35Z'),
  },
  {
    pet_id: 'pet_007',
    user_id: 'user_007',
    type: 'LIKE',
    timestamp: new Date('2024-08-07T16:26:36Z'),
  },
  {
    pet_id: 'pet_008',
    user_id: 'user_008',
    type: 'LOVE',
    timestamp: new Date('2024-08-08T17:27:37Z'),
  },
  {
    pet_id: 'pet_009',
    user_id: 'user_009',
    type: 'DISLIKE',
    timestamp: new Date('2024-08-09T18:28:38Z'),
  },
  {
    pet_id: 'pet_010',
    user_id: 'user_010',
    type: 'LIKE',
    timestamp: new Date('2024-08-10T19:29:39Z'),
  },
]

const getRatings = (): Rating[] => ratings

const getRatingsByPetId = (pet_id: string): Rating | undefined =>
  ratings.find((rating) => rating.pet_id === pet_id)

const getRatingsByUserId = (user_id: string): Rating | undefined =>
  ratings.find((rating) => rating.user_id === user_id)

const getRatingsByType = (type: RatingType): Rating[] =>
  ratings.filter((rating) => rating.type === type)

export default {
  getRatings,
  getRatingsByPetId,
  getRatingsByUserId,
  getRatingsByType,
}
