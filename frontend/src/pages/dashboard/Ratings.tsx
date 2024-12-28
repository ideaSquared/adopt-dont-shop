// src/components/Ratings.tsx
import {
  DateTime,
  FormInput,
  SelectInput,
  Table,
  TextInput,
} from '@adoptdontshop/components'
import { Rating, RatingService, RatingType } from '@adoptdontshop/libs/ratings'
import React, { useEffect, useState } from 'react'

const Ratings: React.FC = () => {
  const [ratings, setRatings] = useState<Rating[]>([])
  const [filteredRatings, setFilteredRatings] = useState<Rating[]>([])
  const [searchTerm, setSearchTerm] = useState<string | null>(null)
  const [filterByType, setFilterByType] = useState<RatingType | null>(null)

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const fetchedRatings = await RatingService.getAllRatings()
        setRatings(fetchedRatings)
        setFilteredRatings(fetchedRatings)
      } catch (error) {
        console.error('Error fetching ratings:', error)
      }
    }
    fetchRatings()
  }, [])

  useEffect(() => {
    const filtered = ratings.filter((rating) => {
      const matchesSearch =
        !searchTerm ||
        rating.pet_id.includes(searchTerm) ||
        rating.user_id.includes(searchTerm)
      const matchesType = !filterByType || rating.rating_type === filterByType
      return matchesSearch && matchesType
    })
    setFilteredRatings(filtered)
  }, [searchTerm, filterByType, ratings])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleFilterTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterByType(e.target.value as RatingType)
  }

  const ratingTypes: RatingType[] = ['like', 'love', 'dislike']

  const handleTypeToSentenceCase = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase()
  }

  const typeOptions = [
    { value: '', label: 'All types' },
    ...ratingTypes.map((type) => ({
      value: type,
      label: handleTypeToSentenceCase(type),
    })),
  ]

  return (
    <div>
      <h1>Ratings</h1>
      <FormInput label="Search by pet ID or user ID">
        <TextInput
          onChange={handleSearchChange}
          type="text"
          value={searchTerm || ''}
        />
      </FormInput>
      <FormInput label="Filter by rating type">
        <SelectInput
          onChange={handleFilterTypeChange}
          value={filterByType || ''}
          options={typeOptions}
        />
      </FormInput>
      <Table striped>
        <thead>
          <tr>
            <th>Pet ID</th>
            <th>User ID</th>
            <th>Rating Type</th>
            <th>Created at</th>
            <th>Updated at</th>
          </tr>
        </thead>
        <tbody>
          {filteredRatings.map((rating) => (
            <tr key={rating.rating_id}>
              <td>{rating.pet_id}</td>
              <td>{rating.user_id}</td>
              <td>{handleTypeToSentenceCase(rating.rating_type)}</td>
              <td>
                <DateTime timestamp={rating.created_at} />
              </td>

              <td>
                <DateTime timestamp={rating.updated_at} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

export default Ratings
