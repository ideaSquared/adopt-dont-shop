import {
  Badge,
  Button,
  FilterConfig,
  GenericFilters,
  Table,
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
const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export const Applications: React.FC<ApplicationsProps> = ({
  isAdminView = false,
}) => {
  const { rescue } = useUser()
  const [applications, setApplications] = useState<Application[]>([])
  const [filteredApplications, setFilteredApplications] = useState<
    Application[]
  >([])
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    waitingOnly: false,
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filter configuration
  const filterConfig: FilterConfig[] = [
    {
      name: 'search',
      label: 'Search by first name or pet name',
      type: 'text',
      placeholder: 'Enter applicant or pet name',
    },
    {
      name: 'status',
      label: 'Filter by status',
      type: 'select',
      options: STATUS_OPTIONS,
    },
    {
      name: 'waitingOnly',
      label: 'Show only waiting applications',
      type: 'checkbox',
    },
  ]

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
        setFilteredApplications(fetchedApplications)
      } catch (error) {
        console.error('Error fetching applications:', error)
        setError('Failed to fetch applications')
      } finally {
        setIsLoading(false)
      }
    }
    fetchApplications()
  }, [isAdminView, rescue])

  useEffect(() => {
    const filtered = applications.filter((application) => {
      const matchesSearch =
        !filters.search ||
        application.applicant_first_name
          ?.toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        application.pet_name
          ?.toLowerCase()
          .includes(filters.search.toLowerCase())

      const matchesStatus =
        filters.status === 'all' || application.status === filters.status

      const matchesWaiting =
        !filters.waitingOnly || application.status === 'pending'

      return matchesSearch && matchesStatus && matchesWaiting
    })
    setFilteredApplications(filtered)
  }, [filters, applications])

  const handleStatusUpdate = async (
    applicationId: string,
    newStatus: string,
  ) => {
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

  if (isLoading) {
    return <LoadingMessage>Loading applications...</LoadingMessage>
  }

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>
  }

  return (
    <Container>
      <Title>Applications {rescue?.rescue_name}</Title>

      <GenericFilters
        filters={filters}
        onFilterChange={(name: string, value: any) =>
          setFilters((prev) => ({ ...prev, [name]: value }))
        }
        filterConfig={filterConfig}
      />

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
