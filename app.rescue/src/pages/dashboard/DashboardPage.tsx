import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  Card,
  CardHeader,
  CardContent,
  Heading,
  Text,
  Button,
  Container,
} from '@adopt-dont-shop/components';
import { useAuth, usePermissions } from '@/contexts/AuthContext';
import { Permission } from '@/types';
import { useQuery } from 'react-query';

// Dashboard types
interface DashboardStats {
  totalPets: number;
  adoptedThisMonth: number;
  pendingApplications: number;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'application' | 'adoption' | 'pet_added';
  description: string;
  timestamp: string;
  petName?: string;
  applicantName?: string;
}

// Mock data for development
const mockDashboardData: DashboardStats = {
  totalPets: 42,
  adoptedThisMonth: 8,
  pendingApplications: 15,
  recentActivity: [
    {
      id: '1',
      type: 'application',
      description: 'New application received for Buddy',
      timestamp: '2025-01-29T10:30:00Z',
      petName: 'Buddy',
      applicantName: 'Sarah Johnson',
    },
    {
      id: '2',
      type: 'adoption',
      description: 'Luna was adopted!',
      timestamp: '2025-01-29T09:15:00Z',
      petName: 'Luna',
    },
    {
      id: '3',
      type: 'pet_added',
      description: 'New pet Max added to the system',
      timestamp: '2025-01-28T16:45:00Z',
      petName: 'Max',
    },
  ],
};

// Styled Components
const DashboardContainer = styled(Container)`
  max-width: 1200px;
  padding: 2rem 1rem;
`;

const WelcomeSection = styled.div`
  margin-bottom: 2rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled(Card)`
  transition:
    transform 0.2s ease-in-out,
    box-shadow 0.2s ease-in-out;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const StatValue = styled.div<{ color: string }>`
  font-size: 2.5rem;
  font-weight: bold;
  color: ${props => props.color};
  margin-bottom: 0.5rem;
  text-align: center;
`;

const StatLabel = styled(Text)`
  text-align: center;
  font-size: 0.875rem;
  color: ${props => props.theme?.text?.secondary || '#6B7280'};
`;

const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ActionCard = styled(Card)`
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const ActivityCard = styled(Card)`
  min-height: 300px;
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: ${props => props.theme?.text?.secondary || '#6B7280'};
`;

const ErrorState = styled.div`
  padding: 2rem;
  text-align: center;
  color: ${props => props.theme?.text?.secondary || '#6B7280'};
  background: ${props => props.theme?.background?.secondary || '#F9FAFB'};
  border-radius: 8px;
`;

/**
 * Dashboard page for the Rescue App
 * Shows role-specific overview and quick actions
 */
export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  // Fetch dashboard data
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useQuery<DashboardStats>('dashboardStats', () => Promise.resolve(mockDashboardData), {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  if (!user) {
    return null;
  }

  const quickActions = [
    {
      title: 'View Animals',
      description: 'Browse all animals in your rescue',
      action: () => {
        navigate('/pets');
      },
      permission: Permission.PETS_VIEW,
    },
    {
      title: 'Add New Animal',
      description: 'Register a new animal profile',
      action: () => {
        // Navigate to add animal - will be implemented in Phase 2
        // console.log('Navigate to add animal');
      },
      permission: Permission.PETS_CREATE,
    },
    {
      title: 'Manage Applications',
      description: 'Review adoption applications',
      action: () => {
        // Navigate to applications - will be implemented in Phase 2
        // console.log('Navigate to applications');
      },
      permission: Permission.APPLICATIONS_VIEW,
    },
    {
      title: 'User Management',
      description: 'Manage rescue staff and volunteers',
      action: () => {
        // Navigate to user management - will be implemented in Phase 2
        // console.log('Navigate to user management');
      },
      permission: Permission.STAFF_VIEW,
    },
    {
      title: 'Rescue Settings',
      description: 'Configure rescue information',
      action: () => {
        // Navigate to settings - will be implemented in Phase 2
        // console.log('Navigate to settings');
      },
      permission: Permission.RESCUE_SETTINGS_VIEW,
    },
  ];

  const availableActions = quickActions.filter(action => hasPermission(action.permission));

  const renderStats = () => {
    if (isLoading) {
      return (
        <StatsGrid>
          {[1, 2, 3, 4].map(i => (
            <StatCard key={i}>
              <CardContent style={{ padding: '1.5rem' }}>
                <LoadingState>Loading...</LoadingState>
              </CardContent>
            </StatCard>
          ))}
        </StatsGrid>
      );
    }

    if (error) {
      return (
        <ErrorState>
          <Text>Unable to load dashboard statistics.</Text>
          <Button
            variant='secondary'
            size='sm'
            onClick={() => refetch()}
            style={{ marginTop: '1rem' }}
          >
            Try Again
          </Button>
        </ErrorState>
      );
    }

    if (!dashboardData) {
      return (
        <StatsGrid>
          {[1, 2, 3, 4].map(i => (
            <StatCard key={i}>
              <CardContent style={{ padding: '1.5rem' }}>
                <StatValue color='#6B7280'>--</StatValue>
                <StatLabel>No Data</StatLabel>
              </CardContent>
            </StatCard>
          ))}
        </StatsGrid>
      );
    }

    return (
      <StatsGrid>
        <StatCard>
          <CardContent style={{ padding: '1.5rem' }}>
            <StatValue color='#3B82F6'>{dashboardData.totalPets}</StatValue>
            <StatLabel>Total Pets</StatLabel>
          </CardContent>
        </StatCard>

        <StatCard>
          <CardContent style={{ padding: '1.5rem' }}>
            <StatValue color='#10B981'>{dashboardData.totalPets - dashboardData.adoptedThisMonth}</StatValue>
            <StatLabel>Available for Adoption</StatLabel>
          </CardContent>
        </StatCard>

        <StatCard>
          <CardContent style={{ padding: '1.5rem' }}>
            <StatValue color='#F59E0B'>{dashboardData.pendingApplications}</StatValue>
            <StatLabel>Pending Applications</StatLabel>
          </CardContent>
        </StatCard>

        <StatCard>
          <CardContent style={{ padding: '1.5rem' }}>
            <StatValue color='#8B5CF6'>{dashboardData.adoptedThisMonth}</StatValue>
            <StatLabel>Adopted This Month</StatLabel>
          </CardContent>
        </StatCard>
      </StatsGrid>
    );
  };

  return (
    <DashboardContainer>
      {/* Welcome Section */}
      <WelcomeSection>
        <Heading
          level='h1'
          style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}
        >
          Welcome back, {user.firstName}!
        </Heading>
        <Text style={{ fontSize: '1.125rem', color: '#6B7280' }}>Your Rescue Dashboard</Text>
      </WelcomeSection>

      {/* Stats Cards */}
      {renderStats()}

      {/* Quick Actions */}
      <div style={{ marginBottom: '2rem' }}>
        <Heading
          level='h2'
          style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}
        >
          Quick Actions
        </Heading>

        {availableActions.length > 0 ? (
          <QuickActionsGrid>
            {availableActions.map((action, index) => (
              <ActionCard key={index} onClick={action.action}>
                <CardHeader>
                  <Heading level='h3' style={{ fontSize: '1.125rem', fontWeight: '500' }}>
                    {action.title}
                  </Heading>
                </CardHeader>
                <CardContent>
                  <Text style={{ color: '#6B7280', marginBottom: '1rem' }}>
                    {action.description}
                  </Text>
                  <Button variant='primary' size='sm' style={{ width: '100%' }}>
                    {action.title}
                  </Button>
                </CardContent>
              </ActionCard>
            ))}
          </QuickActionsGrid>
        ) : (
          <Card>
            <CardContent style={{ padding: '2rem', textAlign: 'center' }}>
              <Text style={{ color: '#6B7280' }}>
                No actions available for your current role. Please contact your administrator.
              </Text>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <Heading
          level='h2'
          style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}
        >
          Recent Activity
        </Heading>
        <ActivityCard>
          <CardContent style={{ padding: '2rem', textAlign: 'center' }}>
            {isLoading ? (
              <LoadingState>Loading activity...</LoadingState>
            ) : dashboardData?.recentActivity?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {dashboardData.recentActivity.slice(0, 5).map((activity: ActivityItem) => (
                  <div
                    key={activity.id}
                    style={{ padding: '1rem', borderBottom: '1px solid #E5E7EB' }}
                  >
                    <Heading level='h4' style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>
                      {activity.description}
                    </Heading>
                    <Text style={{ color: '#6B7280', fontSize: '0.875rem' }}>
                      {activity.petName && `Pet: ${activity.petName}`}
                      {activity.applicantName && ` • Applicant: ${activity.applicantName}`}
                    </Text>
                    <Text style={{ color: '#9CA3AF', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </Text>
                  </div>
                ))}
              </div>
            ) : (
              <Text style={{ color: '#6B7280' }}>
                Activity feed will be available once you start managing pets and applications
              </Text>
            )}
          </CardContent>
        </ActivityCard>
      </div>
    </DashboardContainer>
  );
};
