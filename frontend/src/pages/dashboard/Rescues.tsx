import React, { useState, useEffect } from 'react'
import {
  FormInput,
  SelectInput,
  TextInput,
  Table,
  Button,
} from '@adoptdontshop/components'
import { Rescue, RescueService } from '@adoptdontshop/libs/rescues'

const Rescues: React.FC = () => {
  const [rescues, setRescues] = useState<Rescue[]>([])
  const [filteredRescues, setFilteredRescues] = useState<Rescue[]>([])
  const [filterByType, setFilterByType] = useState<string | null>(null)
  const [staffEmailSearchTerm, setStaffEmailSearchTerm] = useState<
    string | null
  >(null)
  const [rescueNameSearchTerm, setRescueNameSearchTerm] = useState<
    string | null
  >(null)

  useEffect(() => {
    const fetchedRescues = RescueService.getRescues()
    setRescues(fetchedRescues)
    setFilteredRescues(fetchedRescues)
  }, [])

  useEffect(() => {
    const filtered = rescues.filter((rescue) => {
      const matchesType = !filterByType || rescue.rescue_type === filterByType

      const matchesRescueName =
        !rescueNameSearchTerm ||
        (rescue.rescue_name?.toLowerCase() || '').includes(
          rescueNameSearchTerm.toLowerCase(),
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

    setFilteredRescues(filtered)
  }, [filterByType, rescueNameSearchTerm, staffEmailSearchTerm, rescues])

  const handleFilterByTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setFilterByType(e.target.value)
  }

  const handleStaffEmailSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setStaffEmailSearchTerm(e.target.value)
  }

  const handleRescueNameSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRescueNameSearchTerm(e.target.value)
  }

  const rescuesOptions = [
    { value: '', label: 'All types' },
    ...Array.from(new Set(rescues.map((rescue) => rescue.rescue_type))).map(
      (rescue_type) => ({
        value: rescue_type,
        label: rescue_type,
      }),
    ),
  ]

  return (
    <div>
      <h1>Rescues</h1>
      <FormInput label="Search by rescue name">
        <TextInput
          onChange={handleRescueNameSearchChange}
          type="text"
          value={rescueNameSearchTerm || ''}
        />
      </FormInput>
      <FormInput label="Search by staff email">
        <TextInput
          onChange={handleStaffEmailSearchChange}
          type="text"
          value={staffEmailSearchTerm || ''}
        />
      </FormInput>
      <FormInput label="Filter by types">
        <SelectInput
          options={rescuesOptions}
          onChange={handleFilterByTypeChange}
          value={filterByType}
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
              <td>{rescue.rescue_city}</td>
              <td>{rescue.rescue_country}</td>
              <td>
                {rescue.staff.map((staff) => (
                  <div key={staff.user_id}>
                    {staff.first_name} {staff.last_name} ({staff.email})
                  </div>
                ))}
              </td>
              <td>
                <Button type="button">Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

export default Rescues
