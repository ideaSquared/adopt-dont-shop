import {
  DateTime,
  FilterConfig,
  GenericFilters,
  Table,
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
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
  })

  // Filter configuration
  const filterConfig: FilterConfig[] = [
    {
      name: 'search',
      label: 'Search by pet ID or user ID',
      type: 'text',
      placeholder: 'Enter pet ID or user ID',
    },
    {
      name: 'type',
      label: 'Filter by rating type',
      type: 'select',
      options: [
        { value: 'all', label: 'All Types' },
        ...RATING_TYPES.map((type) => ({
          value: type,
          label: type.charAt(0) + type.slice(1).toLowerCase(),
        })),
      ],
    },
  ]

  // Fetch ratings on component mount
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

  // Filter ratings based on the filters state
  useEffect(() => {
    const filtered = ratings.filter((rating) => {
      const matchesSearch =
        !filters.search ||
        rating.pet_id.includes(filters.search) ||
        rating.user_id.includes(filters.search)

      const matchesType =
        filters.type === 'all' || rating.rating_type === filters.type

      return matchesSearch && matchesType
    })
    setFilteredRatings(filtered)
  }, [filters, ratings])

  return (
    <Container>
      <Title>Ratings</Title>

      <GenericFilters
        filters={filters}
        onFilterChange={(name: string, value: string | boolean) =>
          setFilters((prev) => ({ ...prev, [name]: value }))
        }
        filterConfig={filterConfig}
      />

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
                <td>
                  {rating.rating_type.charAt(0) +
                    rating.rating_type.slice(1).toLowerCase()}
                </td>
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
