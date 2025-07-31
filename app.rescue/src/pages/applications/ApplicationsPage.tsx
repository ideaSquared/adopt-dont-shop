import React, { useState } from 'react';
import styled from 'styled-components';
import {
  Card,
  CardContent,
  Heading,
  Text,
  Button,
  Container,
  Badge,
  Input,
} from '@adopt-dont-shop/components';
import { useQuery } from 'react-query';
import type { Application, ApplicationStatus } from '@adopt-dont-shop/lib-applications';
import { 
  FiSearch, 
  FiFilter, 
  FiEye, 
  FiMessageCircle,
  FiClock,
  FiCheckCircle,
  FiXCircle
} from 'react-icons/fi';

// Styled Components
const ApplicationsContainer = styled(Container)`
  max-width: 1400px;
  padding: 2rem 1rem;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const FiltersSection = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  align-items: center;
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
`;

const SearchIcon = styled(FiSearch)`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  z-index: 1;
`;

const SearchInput = styled(Input)`
  padding-left: 40px;
`;

const ApplicationsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const ApplicationCard = styled(Card)`
  transition: all 0.2s ease-in-out;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const ApplicationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ApplicationInfo = styled.div`
  flex: 1;
`;

const StatusBadge = styled(Badge)<{ $status: ApplicationStatus }>`
  ${props => {
    switch (props.$status) {
      case 'submitted':
        return 'background-color: #F59E0B; color: white;';
      case 'approved':
        return 'background-color: #10B981; color: white;';
      case 'rejected':
        return 'background-color: #EF4444; color: white;';
      case 'under_review':
        return 'background-color: #3B82F6; color: white;';
      case 'pending_references':
        return 'background-color: #8B5CF6; color: white;';
      case 'draft':
        return 'background-color: #6B7280; color: white;';
      case 'withdrawn':
        return 'background-color: #374151; color: white;';
      case 'expired':
        return 'background-color: #9CA3AF; color: white;';
      default:
        return 'background-color: #6B7280; color: white;';
    }
  }}
`;

const ApplicationActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const ActionButton = styled(Button)`
  padding: 0.5rem 1rem;
  min-width: auto;
`;

const EmptyStateIcon = styled.div`
  font-size: 3rem;
  color: #9ca3af;
  margin-bottom: 1rem;
`;

const NoResultsContainer = styled.div`
  text-align: center;
  padding: 2rem;
  color: #6b7280;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled(Card)`
  text-align: center;
  padding: 1rem;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #3b82f6;
  margin-bottom: 0.25rem;
`;

const StatLabel = styled(Text)`
  font-size: 0.875rem;
  color: #6b7280;
`;

const StyledSelect = styled.select`
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: white;
  color: #374151;
  cursor: pointer;
  transition: border-color 0.2s ease-in-out;

  &:hover {
    border-color: #9ca3af;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

// Mock data for development
const mockApplications: Application[] = [
  {
    id: '1',
    petId: 'pet1',
    userId: 'user1',
    rescueId: 'rescue1',
    status: 'submitted',
    data: {
      petId: 'pet1',
      userId: 'user1',
      rescueId: 'rescue1',
      personalInfo: {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@email.com',
        phone: '(555) 123-4567',
        address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701',
      },
      livingsituation: {
        housingType: 'house',
        isOwned: true,
        hasYard: true,
        allowsPets: true,
        householdSize: 2,
        hasAllergies: false,
      },
      petExperience: {
        hasPetsCurrently: false,
        experienceLevel: 'some',
        willingToTrain: true,
        hoursAloneDaily: 6,
        exercisePlans: 'Daily walks and weekend hikes',
      },
      references: {
        personal: [
          {
            name: 'John Smith',
            relationship: 'Friend',
            phone: '(555) 987-6543',
            yearsKnown: 5,
          },
        ],
      },
    },
    createdAt: '2025-01-28T10:30:00Z',
    updatedAt: '2025-01-29T15:45:00Z',
  },
  {
    id: '2',
    petId: 'pet2',
    userId: 'user2',
    rescueId: 'rescue1',
    status: 'under_review',
    data: {
      petId: 'pet2',
      userId: 'user2',
      rescueId: 'rescue1',
      personalInfo: {
        firstName: 'Mike',
        lastName: 'Chen',
        email: 'mike.chen@email.com',
        phone: '(555) 987-6543',
        address: '456 Oak Ave',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62702',
      },
      livingsituation: {
        housingType: 'apartment',
        isOwned: false,
        hasYard: false,
        allowsPets: true,
        householdSize: 1,
        hasAllergies: false,
      },
      petExperience: {
        hasPetsCurrently: false,
        experienceLevel: 'beginner',
        willingToTrain: true,
        hoursAloneDaily: 8,
        exercisePlans: 'Morning and evening walks',
      },
      references: {
        personal: [
          {
            name: 'Lisa Wang',
            relationship: 'Coworker',
            phone: '(555) 456-7890',
            yearsKnown: 3,
          },
        ],
      },
    },
    createdAt: '2025-01-27T14:20:00Z',
    updatedAt: '2025-01-28T09:15:00Z',
  },
];

/**
 * ApplicationsPage component for managing adoption applications
 * Provides comprehensive application review and management capabilities
 */
export const ApplicationsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // In production, this would fetch from the service
  const { data: applications = mockApplications, isLoading } = useQuery(
    ['applications', statusFilter, searchTerm],
    () => {
      // Placeholder for actual service call
      return Promise.resolve(mockApplications);
    }
  );

  // Calculate statistics
  const stats = {
    total: applications.length,
    submitted: applications.filter(app => app.status === 'submitted').length,
    underReview: applications.filter(app => app.status === 'under_review').length,
    approved: applications.filter(app => app.status === 'approved').length,
    rejected: applications.filter(app => app.status === 'rejected').length,
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = !searchTerm || 
      app.data.personalInfo?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.data.personalInfo?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.data.personalInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewApplication = (applicationId: string) => {
    // Navigate to application details
    console.log('View application:', applicationId);
  };

  const handleMessageApplicant = (applicationId: string) => {
    // Open communication with applicant
    console.log('Message applicant for application:', applicationId);
  };

  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case 'submitted':
        return <FiClock />;
      case 'approved':
        return <FiCheckCircle />;
      case 'rejected':
        return <FiXCircle />;
      case 'under_review':
        return <FiEye />;
      default:
        return <FiClock />;
    }
  };

  return (
    <ApplicationsContainer>
      <HeaderSection>
        <div>
          <Heading level="h1">Adoption Applications</Heading>
          <Text color="muted">Review and manage adoption applications from potential adopters</Text>
        </div>
      </HeaderSection>

      <StatsGrid>
        <StatCard>
          <StatValue>{stats.total}</StatValue>
          <StatLabel>Total Applications</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.submitted}</StatValue>
          <StatLabel>New Submissions</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.underReview}</StatValue>
          <StatLabel>Under Review</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.approved}</StatValue>
          <StatLabel>Approved</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.rejected}</StatValue>
          <StatLabel>Rejected</StatLabel>
        </StatCard>
      </StatsGrid>

      <FiltersSection>
        <SearchContainer>
          <SearchIcon />
          <SearchInput
            placeholder="Search applications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchContainer>
        
        <StyledSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="pending_references">Pending References</option>
        </StyledSelect>

        <Button variant="outline" startIcon={<FiFilter />}>
          More Filters
        </Button>
      </FiltersSection>

      {isLoading ? (
        <Card>
          <CardContent>
            <Text>Loading applications...</Text>
          </CardContent>
        </Card>
      ) : (
        <ApplicationsGrid>
          {filteredApplications.map((application) => (
            <ApplicationCard key={application.id}>
              <CardContent>
                <ApplicationHeader>
                  <ApplicationInfo>
                    <Heading level="h4">
                      {application.data.personalInfo?.firstName} {application.data.personalInfo?.lastName}
                    </Heading>
                    <Text color="muted" size="sm">
                      {application.data.personalInfo?.email} • {application.data.personalInfo?.phone}
                    </Text>
                    <Text color="muted" size="sm">
                      Applied: {new Date(application.createdAt).toLocaleDateString()}
                    </Text>
                  </ApplicationInfo>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <StatusBadge $status={application.status}>
                      {getStatusIcon(application.status)}
                      {application.status.replace('_', ' ').toUpperCase()}
                    </StatusBadge>
                    
                    <ApplicationActions>
                      <ActionButton
                        variant="outline"
                        size="sm"
                        startIcon={<FiEye />}
                        onClick={() => handleViewApplication(application.id)}
                        title="View Application"
                      >
                        View
                      </ActionButton>
                      <ActionButton
                        variant="outline" 
                        size="sm"
                        startIcon={<FiMessageCircle />}
                        onClick={() => handleMessageApplicant(application.id)}
                        title="Message Applicant"
                      >
                        Message
                      </ActionButton>
                    </ApplicationActions>
                  </div>
                </ApplicationHeader>
              </CardContent>
            </ApplicationCard>
          ))}
          
          {filteredApplications.length === 0 && (
            <Card style={{ gridColumn: '1 / -1' }}>
              <CardContent>
                <NoResultsContainer>
                  <EmptyStateIcon>
                    📋
                  </EmptyStateIcon>
                  <Heading level="h3">No Applications Found</Heading>
                  <Text color="muted" style={{ marginTop: '0.5rem' }}>
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filters to find applications'
                      : 'No applications have been submitted yet. Applications will appear here once potential adopters submit them.'
                    }
                  </Text>
                  {!searchTerm && statusFilter === 'all' && (
                    <Text size="sm" color="muted" style={{ marginTop: '1rem' }}>
                      💡 Tip: Share your rescue's pet profiles to start receiving adoption applications
                    </Text>
                  )}
                </NoResultsContainer>
              </CardContent>
            </Card>
          )}
        </ApplicationsGrid>
      )}
    </ApplicationsContainer>
  );
};
