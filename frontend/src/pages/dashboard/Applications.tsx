import {
  Badge,
  Button,
  CheckboxInput,
  FormInput,
  SelectInput,
  Table,
  TextInput,
  Tooltip,
} from '@adoptdontshop/components'
import {
  Application,
  ApplicationService,
} from '@adoptdontshop/libs/applications'
import { useUser } from 'contexts/auth/UserContext'
import React, { useEffect, useState } from 'react'
const Applications: React.FC<{ isAdminView?: boolean }> = ({
  isAdminView = false,
}) => {
  const { rescue } = useUser()
  const [applications, setApplications] = useState<Application[]>([])
  const [searchTerm, setSearchTerm] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [onlyWaiting, setOnlyWaiting] = useState<boolean>(false)

  // Fetch applications data from backend on component mount
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const fetchedApplications = isAdminView
          ? await ApplicationService.getApplications()
          : await ApplicationService.getApplicationsByRescueId()
        setApplications(fetchedApplications)
      } catch (error) {
        console.error('Error fetching applications:', error)
      }
    }
    fetchApplications()
  }, [isAdminView])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleStatusFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setFilterStatus(e.target.value)
  }

  const handleOnlyWaitingBooleanChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setOnlyWaiting((prevState) => !prevState)
  }

  const handleStatusUpdate = async (
    applicationId: string,
    newStatus: string,
  ) => {
    try {
      await ApplicationService.updateApplication(applicationId, {
        status: newStatus,
      })
      const refreshedApplications = isAdminView
        ? await ApplicationService.getApplications()
        : await ApplicationService.getApplicationsByRescueId()
      setApplications(refreshedApplications)
    } catch (error) {
      console.error(`Error updating application status:`, error)
    }
  }

  const filteredApplications = applications.filter((application) => {
    const matchesSearch =
      !searchTerm ||
      application.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.pet_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || application.status === filterStatus
    const matchesWaiting = !onlyWaiting || application.status === 'pending'

    return matchesSearch && matchesStatus && matchesWaiting
  })

  const filterOptions = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ]

  return (
    <div>
      <h1>Applications {rescue?.rescue_id}</h1>
      <FormInput label="Search by first name or pet name">
        <TextInput
          value={searchTerm || ''}
          type="text"
          onChange={handleSearchChange}
        />
      </FormInput>
      <FormInput label="Filter by status">
        <SelectInput
          options={filterOptions}
          value={filterStatus}
          onChange={handleStatusFilterChange}
        />
      </FormInput>
      <FormInput label="Show only waiting applications">
        <CheckboxInput
          checked={onlyWaiting}
          onChange={handleOnlyWaitingBooleanChange}
        />
      </FormInput>
      <Table hasActions>
        <thead>
          <tr>
            <th>First name</th>
            <th>Pet name</th>
            <th>Description</th>
            <th>Status</th>
            <th>Actioned by</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredApplications.map((application) => (
            <tr key={application.application_id}>
              <td>
                <Tooltip content={application.user_id}>
                  <span>{application.applicant_first_name || 'N/A'}</span>
                </Tooltip>
              </td>
              <td>{application.pet_name}</td>
              <td>{application.description}</td>
              <td>
                <Badge
                  variant={
                    application.status === 'approved'
                      ? 'success'
                      : application.status === 'rejected'
                        ? 'warning'
                        : 'content'
                  }
                >
                  {application.status.charAt(0).toUpperCase() +
                    application.status.slice(1)}
                </Badge>
              </td>
              <td>
                <Tooltip content={application.actioned_by}>
                  <span>{application.actioned_by_first_name || 'N/A'}</span>
                </Tooltip>
              </td>
              <td>
                {application.status === 'pending' ? (
                  <>
                    <Button
                      type="button"
                      onClick={() =>
                        handleStatusUpdate(
                          application.application_id,
                          'approved',
                        )
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      onClick={() =>
                        handleStatusUpdate(
                          application.application_id,
                          'rejected',
                        )
                      }
                    >
                      Reject
                    </Button>
                  </>
                ) : (
                  <Badge
                    variant={
                      application.status === 'approved' ? 'success' : 'warning'
                    }
                  >
                    {application.status.charAt(0).toUpperCase() +
                      application.status.slice(1)}
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

export default Applications
