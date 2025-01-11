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

const StatusBadge = styled(Badge)`
  text-transform: capitalize;
`

const LoadingMessage = styled.div`
  padding: 2rem;
  text-align: center;
  font-size: 1.2rem;
  color: #666;
`

const ErrorMessage = styled.div`
  padding: 2rem;
  text-align: center;
  color: #d32f2f;
  font-size: 1.2rem;
`

const NoDataMessage = styled.div`
  padding: 2rem;
  text-align: center;
  color: #666;
  font-size: 1.2rem;
`

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`

// Types
type ApplicationsProps = {
  isAdminView?: boolean
}

// Constants
const FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

// Component
export const Applications: React.FC<ApplicationsProps> = ({
  isAdminView = false,
}) => {
  const { rescue } = useUser()
  const [applications, setApplications] = useState<Application[]>([])
  const [searchTerm, setSearchTerm] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [onlyWaiting, setOnlyWaiting] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchApplications = async () => {
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
    if (!rescue?.rescue_id) {
      setError('No rescue ID found')
      return
    }

    try {
      setError(null)
      await ApplicationService.updateApplication(applicationId, {
        status: newStatus,
      })
      const refreshedApplications =
        await ApplicationService.getApplicationsByRescueId(rescue!.rescue_id)
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

  if (isLoading) {
    return <LoadingMessage>Loading applications...</LoadingMessage>
  }

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>
  }

  return (
    <Container>
      <Title>Applications {rescue?.rescue_name}</Title>
      <FilterContainer>
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
            options={FILTER_OPTIONS}
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
      </FilterContainer>

      {filteredApplications.length === 0 ? (
        <NoDataMessage>No applications found</NoDataMessage>
      ) : (
        <TableContainer>
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
                    <StatusBadge
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
                    </StatusBadge>
                  </td>
                  <td>
                    <Tooltip content={application.actioned_by}>
                      <span>{application.actioned_by_first_name || 'N/A'}</span>
                    </Tooltip>
                  </td>
                  <td>
                    {application.status === 'pending' ? (
                      <ActionButtons>
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
                      </ActionButtons>
                    ) : (
                      <StatusBadge
                        variant={
                          application.status === 'approved'
                            ? 'success'
                            : 'warning'
                        }
                      >
                        {application.status.charAt(0).toUpperCase() +
                          application.status.slice(1)}
                      </StatusBadge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableContainer>
      )}
    </Container>
  )
}
