import {
  Button,
  FormInput,
  SelectInput,
  Table,
  TextInput,
} from '@adoptdontshop/components'
import { Rescue, RescueService } from '@adoptdontshop/libs/rescues'
import React, { ChangeEvent, useEffect, useMemo, useState } from 'react'

const Rescues: React.FC = () => {
  const [rescues, setRescues] = useState<Rescue[]>([])
  const [searchTerm, setSearchTerm] = useState<string | null>(null)
  const [filterByType, setFilterByType] = useState<string | null>(null)
  const [staffEmailSearchTerm, setStaffEmailSearchTerm] = useState<
    string | null
  >(null)

  // Fetch rescues on component mount
  useEffect(() => {
    const fetchRescues = async () => {
      try {
        const fetchedRescues = await RescueService.getRescues()
        setRescues(fetchedRescues)
      } catch (error) {
        console.error('Failed to fetch rescues:', error)
      }
    }

    fetchRescues()
  }, [])

  const filteredRescues = useMemo(() => {
    if (!Array.isArray(rescues)) return []
    return rescues.filter((rescue) => {
      const matchesType = !filterByType || rescue.rescue_type === filterByType
      const matchesRescueName =
        !searchTerm ||
        (rescue.rescue_name?.toLowerCase() || '').includes(
          searchTerm.toLowerCase(),
        )
      const matchesStaffEmail =
        !staffEmailSearchTerm ||
        rescue.staff.some((staff) =>
          staff.email
            .toLowerCase()
            .includes(staffEmailSearchTerm.toLowerCase()),
        )
      return matchesType && matchesRescueName && matchesStaffEmail
    })
  }, [filterByType, searchTerm, staffEmailSearchTerm, rescues])

  // Event handlers for input changes
  const handleSearchTermChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleStaffEmailSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setStaffEmailSearchTerm(e.target.value)
  }

  const handleFilterByTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setFilterByType(e.target.value)
  }

  const rescuesOptions = [
    { value: '', label: 'All types' },
    ...Array.from(
      new Set(
        Array.isArray(rescues)
          ? rescues.map((rescue) => rescue.rescue_type)
          : [],
      ),
    ).map((rescue_type) => ({
      value: rescue_type,
      label: rescue_type,
    })),
  ]

  return (
    <div>
      <h1>Rescues</h1>
      <FormInput label="Search by rescue name">
        <TextInput
          onChange={handleSearchTermChange}
          type="text"
          value={searchTerm || ''}
        />
      </FormInput>
      <FormInput label="Search by staff email">
        <TextInput
          onChange={handleStaffEmailSearchChange}
          type="text"
          value={staffEmailSearchTerm || ''}
        />
      </FormInput>
      <FormInput label="Filter by type">
        <SelectInput
          options={rescuesOptions}
          onChange={handleFilterByTypeChange}
          value={filterByType || ''}
        />
      </FormInput>
      <Table>
        <thead>
          <tr>
            <th>Rescue ID</th>
            <th>Rescue Name</th>
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
    </div>
  )
}

export default Rescues
