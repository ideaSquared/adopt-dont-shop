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
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch applications data from backend on component mount
  useEffect(() => {
    const fetchApplications = async () => {
      if (!rescue?.rescue_id && !isAdminView) {
        setError('No rescue ID found')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const fetchedApplications = isAdminView
          ? await ApplicationService.getApplications()
          : await ApplicationService.getApplicationsByRescueId(
              rescue!.rescue_id,
            )
        setApplications(fetchedApplications)
      } catch (error) {
        console.error('Error fetching applications:', error)
        setError('Failed to fetch applications')
      } finally {
        setIsLoading(false)
      }
    }
    fetchApplications()
  }, [isAdminView, rescue])

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
    if (!rescue?.rescue_id && !isAdminView) {
      setError('No rescue ID found')
      return
    }

    try {
      setError(null)
      await ApplicationService.updateApplication(applicationId, {
        status: newStatus,
      })
      const refreshedApplications = isAdminView
        ? await ApplicationService.getApplications()
        : await ApplicationService.getApplicationsByRescueId(rescue!.rescue_id)
      setApplications(refreshedApplications)
    } catch (error) {
      console.error(`Error updating application status:`, error)
      setError('Failed to update application status')
    }
  }

  const filteredApplications = applications.filter((application) => {
    const matchesSearch =
      !searchTerm ||
      application.applicant_first_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      application.pet_name?.toLowerCase().includes(searchTerm.toLowerCase())
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

  if (isLoading) {
    return <div>Loading applications...</div>
  }

  if (error) {
    return <div className="error-message">{error}</div>
  }

  return (
    <div>
      <h1>Applications {rescue?.rescue_name}</h1>
      <div className="filters">
        <FormInput label="Search by first name or pet name">
          <TextInput
            value={searchTerm || ''}
            type="text"
            onChange={handleSearchChange}
            placeholder="Search applications..."
          />
        </FormInput>
        <FormInput label="Filter by status">
          <SelectInput
            options={filterOptions}
            value={filterStatus || ''}
            onChange={handleStatusFilterChange}
          />
        </FormInput>
        <FormInput label="Show only waiting applications">
          <CheckboxInput
            checked={onlyWaiting}
            onChange={handleOnlyWaitingBooleanChange}
          />
        </FormInput>
      </div>

      {filteredApplications.length === 0 ? (
        <div>No applications found</div>
      ) : (
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
                        application.status === 'approved'
                          ? 'success'
                          : 'warning'
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
      )}
    </div>
  )
}

export default Applications
