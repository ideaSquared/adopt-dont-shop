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
import styled from 'styled-components'

// Style definitions
const Container = styled.div`
  padding: 1rem;
`

const Title = styled.h1`
  margin-bottom: 2rem;
  font-size: 1.8rem;
`

const FilterContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
`

const TableContainer = styled.div`
  margin-top: 2rem;
`

// Types
type RatingsProps = Record<string, never>

// Constants
const RATING_TYPES: RatingType[] = ['like', 'love', 'dislike']

// Component
export const Ratings: React.FC<RatingsProps> = () => {
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

  const handleTypeToSentenceCase = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase()
  }

  const typeOptions = [
    { value: '', label: 'All types' },
    ...RATING_TYPES.map((type) => ({
      value: type,
      label: handleTypeToSentenceCase(type),
    })),
  ]

  return (
    <Container>
      <Title>Ratings</Title>
      <FilterContainer>
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
      </FilterContainer>
      <TableContainer>
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
      </TableContainer>
    </Container>
  )
}
