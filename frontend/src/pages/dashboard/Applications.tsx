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
import { Link } from 'react-router-dom'
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

const AnswerPreview = styled.div`
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

// Types
type ApplicationsProps = {
  isAdminView?: boolean
}

type ApplicationStatus = 'pending' | 'approved' | 'rejected'

interface ApplicationAnswers {
  home_type: string
  own_or_rent: string
  landlord_permission?: boolean
  yard_size: string
  household_members: number
  children_ages?: string
  current_pets: boolean
  current_pet_details?: string
  pet_experience: string[]
  veterinarian: boolean
  vet_name?: string
  exercise_plan: string
  daily_schedule: string
  time_alone: number
  emergency_contact: string
}

// Constants
const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const HOME_TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'House', label: 'House' },
  { value: 'Apartment', label: 'Apartment' },
  { value: 'Condo', label: 'Condo' },
  { value: 'Other', label: 'Other' },
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
    homeType: 'all',
    hasPets: 'all',
    waitingOnly: false,
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filter configuration
  const filterConfig: FilterConfig[] = [
    {
      name: 'search',
      label: 'Search by pet name or emergency contact',
      type: 'text',
      placeholder: 'Enter search term',
    },
    {
      name: 'status',
      label: 'Filter by status',
      type: 'select',
      options: STATUS_OPTIONS,
    },
    {
      name: 'homeType',
      label: 'Filter by home type',
      type: 'select',
      options: HOME_TYPE_OPTIONS,
    },
    {
      name: 'hasPets',
      label: 'Filter by current pets',
      type: 'select',
      options: [
        { value: 'all', label: 'All' },
        { value: 'yes', label: 'Has pets' },
        { value: 'no', label: "Doesn't have pets" },
      ],
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
      } catch (err) {
        setError('Failed to fetch applications')
      } finally {
        setIsLoading(false)
      }
    }
    fetchApplications()
  }, [isAdminView, rescue])

  useEffect(() => {
    const filtered = applications.filter((application) => {
      const answers = application.answers as unknown as ApplicationAnswers

      const matchesSearch =
        !filters.search ||
        application.pet_name
          ?.toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        answers.emergency_contact
          .toLowerCase()
          .includes(filters.search.toLowerCase())

      const matchesStatus =
        filters.status === 'all' || application.status === filters.status

      const matchesHomeType =
        filters.homeType === 'all' || answers.home_type === filters.homeType

      const matchesHasPets =
        filters.hasPets === 'all' ||
        (filters.hasPets === 'yes' && answers.current_pets) ||
        (filters.hasPets === 'no' && !answers.current_pets)

      const matchesWaiting =
        !filters.waitingOnly || application.status === 'pending'

      return (
        matchesSearch &&
        matchesStatus &&
        matchesHomeType &&
        matchesHasPets &&
        matchesWaiting
      )
    })
    setFilteredApplications(filtered)
  }, [filters, applications])

  const handleStatusUpdate = async (
    applicationId: string,
    newStatus: ApplicationStatus,
  ) => {
    try {
      setError(null)
      await ApplicationService.updateApplication(applicationId, {
        status: newStatus,
      })
      const refreshedApplications =
        await ApplicationService.getApplicationsByRescueId(rescue!.rescue_id)
      setApplications(refreshedApplications)
    } catch (err) {
      setError('Failed to update application status')
    }
  }

  const getAnswerSummary = (answers: ApplicationAnswers): string => {
    return `${answers.home_type} home, ${
      answers.current_pets ? 'Has pets' : 'No pets'
    }, ${answers.household_members} household members`
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

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <Link
          to={
            isAdminView
              ? '/admin/applications/questions'
              : '/applications/questions'
          }
        >
          <Button variant="info">
            {isAdminView
              ? 'Manage Application Questions'
              : 'View Application Questions'}
          </Button>
        </Link>
      </div>

      <GenericFilters
        filters={filters}
        onFilterChange={(name: string, value: unknown) =>
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
                <th>Pet Name</th>
                <th>Application Summary</th>
                <th>Status</th>
                <th>Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map((application) => {
                const answers =
                  application.answers as unknown as ApplicationAnswers
                return (
                  <tr key={application.application_id}>
                    <td>{application.pet_name}</td>
                    <td>
                      <Tooltip content={JSON.stringify(answers, null, 2)}>
                        <AnswerPreview>
                          {getAnswerSummary(answers)}
                        </AnswerPreview>
                      </Tooltip>
                    </td>
                    <td>
                      <StatusBadge
                        variant={
                          application.status === 'approved'
                            ? 'success'
                            : application.status === 'rejected'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {application.status.charAt(0).toUpperCase() +
                          application.status.slice(1)}
                      </StatusBadge>
                    </td>
                    <td>
                      <Tooltip content={answers.emergency_contact}>
                        <span>{answers.emergency_contact}</span>
                      </Tooltip>
                    </td>
                    <td>
                      <ActionButtons>
                        <Link
                          to={
                            isAdminView
                              ? `/admin/applications/${application.application_id}`
                              : `/applications/${application.application_id}`
                          }
                        >
                          <Button variant="info">View</Button>
                        </Link>
                        {application.status === 'pending' && (
                          <>
                            <Button
                              variant="success"
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
                              variant="danger"
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
                        )}
                      </ActionButtons>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </TableContainer>
      )}
    </Container>
  )
}
