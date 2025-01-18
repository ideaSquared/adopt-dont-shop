import {
  Button,
  FilterConfig,
  GenericFilters,
  Table,
} from '@adoptdontshop/components'
import { Rescue, RescueService } from '@adoptdontshop/libs/rescues'
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
type RescuesProps = Record<string, never>

// Component
export const Rescues: React.FC<RescuesProps> = () => {
  const [rescues, setRescues] = useState<Rescue[]>([])
  const [filteredRescues, setFilteredRescues] = useState<Rescue[]>([])
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    staffEmail: '',
  })

  // Filter configuration
  const filterConfig: FilterConfig[] = [
    {
      name: 'search',
      label: 'Search by rescue name',
      type: 'text',
      placeholder: 'Enter rescue name',
    },
    {
      name: 'type',
      label: 'Filter by type',
      type: 'select',
      options: [
        { value: 'all', label: 'All Types' },
        ...Array.from(new Set(rescues.map((rescue) => rescue.rescue_type))).map(
          (rescueType) => ({
            value: rescueType,
            label: rescueType,
          }),
        ),
      ],
    },
    {
      name: 'staffEmail',
      label: 'Search by staff email',
      type: 'text',
      placeholder: 'Enter staff email',
    },
  ]

  // Fetch rescues on component mount
  useEffect(() => {
    const fetchRescues = async () => {
      try {
        const fetchedRescues = await RescueService.getRescues()
        setRescues(fetchedRescues)
        setFilteredRescues(fetchedRescues)
      } catch (error) {
        console.error('Failed to fetch rescues:', error)
      }
    }

    fetchRescues()
  }, [])

  // Filter rescues based on the filters state
  useEffect(() => {
    const filtered = rescues.filter((rescue) => {
      const matchesSearch =
        !filters.search ||
        (rescue.rescue_name?.toLowerCase() || '').includes(
          filters.search.toLowerCase(),
        )

      const matchesType =
        filters.type === 'all' || rescue.rescue_type === filters.type

      const matchesStaffEmail =
        !filters.staffEmail ||
        rescue.staff.some((staff) =>
          staff.email.toLowerCase().includes(filters.staffEmail.toLowerCase()),
        )

      return matchesSearch && matchesType && matchesStaffEmail
    })

    setFilteredRescues(filtered)
  }, [filters, rescues])

  return (
    <Container>
      <Title>Rescues</Title>

      <GenericFilters
        filters={filters}
        onFilterChange={(name: string, value: string | boolean) =>
          setFilters((prev) => ({ ...prev, [name]: value }))
        }
        filterConfig={filterConfig}
      />

      <TableContainer>
        <Table>
          <thead>
            <tr>
              <th>Rescue ID</th>
              <th>Rescue Name</th>
              <th>Reference Number</th>
              <th>Type</th>
              <th>City</th>
              <th>Country</th>
              <th>Staff Members</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRescues.map((rescue) => (
              <tr key={rescue.rescue_id}>
                <td>{rescue.rescue_id}</td>
                <td>{rescue.rescue_name}</td>
                <td>
                  {rescue.rescue_type != 'Individual'
                    ? rescue.reference_number
                    : 'N/A'}
                </td>
                <td>{rescue.rescue_type}</td>
                <td>{rescue.city}</td>
                <td>{rescue.country}</td>
                <td>
                  {rescue.staff.map((staff) => (
                    <div key={staff.user_id}>
                      {staff.first_name} {staff.last_name} ({staff.email})
                    </div>
                  ))}
                </td>
                <td>
                  <Button
                    variant="danger"
                    onClick={() => console.log(`Delete ${rescue.rescue_id}`)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableContainer>
    </Container>
  )
}
