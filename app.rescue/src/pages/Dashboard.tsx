import React from 'react';
import styled from 'styled-components';
import { Card, Container, Heading, Text } from '@adopt-dont-shop/components';
import { useAuth } from '../contexts/AuthContext';

const DashboardContainer = styled(Container)`
  max-width: none;
  margin: 0;
  width: 100%;
  padding: 0;
`;

const DashboardHeader = styled.div`
  margin-bottom: 2rem;

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: ${props => props.theme.text.primary};
    margin: 0 0 0.5rem 0;
  }

  p {
    font-size: 1.1rem;
    color: ${props => props.theme.text.secondary};
    margin: 0;
  }
`;

const WelcomeMessage = styled.div`
  background: linear-gradient(135deg, ${props => props.theme.colors.primary[50]} 0%, ${props => props.theme.colors.primary[100]} 100%);
  border: 1px solid ${props => props.theme.colors.primary[200]};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;

  h2 {
    margin: 0 0 0.5rem 0;
    color: ${props => props.theme.colors.primary[800]};
    font-size: 1.25rem;
  }

  p {
    margin: 0;
    color: ${props => props.theme.colors.primary[700]};
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
  width: 100%;
`;

const AnalyticsGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
  width: 100%;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Mock data - will be replaced with real data from lib.rescue and lib.analytics
  // In the future, this will fetch data specific to the user's rescue organization
  const metrics = {
    totalPets: 45,
    successfulAdoptions: 23,
    pendingApplications: 12,
    averageRating: 4.8,
    adoptionRate: 85,
    averageResponseTime: 18, // hours
  };

  const monthlyAdoptions = [
    { month: 'Jan', adoptions: 8 },
    { month: 'Feb', adoptions: 12 },
    { month: 'Mar', adoptions: 15 },
    { month: 'Apr', adoptions: 18 },
    { month: 'May', adoptions: 23 },
    { month: 'Jun', adoptions: 20 },
  ];

  const petStatusDistribution = [
    { name: 'Available', value: 25, color: '#10B981' },
    { name: 'Pending', value: 12, color: '#F59E0B' },
    { name: 'Medical Care', value: 5, color: '#EF4444' },
    { name: 'Foster', value: 3, color: '#8B5CF6' },
  ];

  return (
    <DashboardContainer>
      <DashboardHeader>
        <Heading level="h1">Rescue Dashboard</Heading>
        <Text>Welcome back! Here's what's happening with your rescue today.</Text>
      </DashboardHeader>

      {/* Welcome Message for Current User */}
      <WelcomeMessage>
        <h2>Welcome back, {user?.firstName || 'Team Member'}! 👋</h2>
        <p>You're logged in as a {user?.userType?.replace('_', ' ') || 'rescue staff member'}. Here's your rescue overview for today.</p>
      </WelcomeMessage>

      {/* Key Metrics Row */}
      <MetricsGrid>
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>🐕</span>
              <Text style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                Total Pets
              </Text>
            </div>
            <Text style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {metrics.totalPets}
            </Text>
            <Text style={{ fontSize: '0.875rem', color: '#10b981' }}>
              ↑ 5% from last month
            </Text>
          </div>
        </Card>

        <Card>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>❤️</span>
              <Text style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                Successful Adoptions
              </Text>
            </div>
            <Text style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {metrics.successfulAdoptions}
            </Text>
            <Text style={{ fontSize: '0.875rem', color: '#10b981' }}>
              ↑ 12% from last month
            </Text>
          </div>
        </Card>

        <Card>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>📋</span>
              <Text style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                Pending Applications
              </Text>
            </div>
            <Text style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {metrics.pendingApplications}
            </Text>
            <Text style={{ fontSize: '0.875rem', color: '#ef4444' }}>
              ↓ 2% from last month
            </Text>
          </div>
        </Card>

        <Card>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>📊</span>
              <Text style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                Adoption Rate
              </Text>
            </div>
            <Text style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {metrics.adoptionRate}%
            </Text>
            <Text style={{ fontSize: '0.875rem', color: '#10b981' }}>
              ↑ 3% from last month
            </Text>
          </div>
        </Card>
      </MetricsGrid>

      {/* Charts and Analytics Row */}
      <AnalyticsGrid>
        <Card>
          <div style={{ padding: '1.5rem 1.5rem 1rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <Heading level="h3" style={{ margin: 0 }}>Monthly Adoptions</Heading>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'end', height: '180px', gap: '0.5rem', marginBottom: '1rem' }}>
              {monthlyAdoptions.map((item, index) => (
                <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <div 
                    style={{ 
                      background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
                      borderRadius: '4px 4px 0 0',
                      width: '100%',
                      height: `${(item.adoptions / 23) * 100}%`,
                      minHeight: '4px',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    title={`${item.month}: ${item.adoptions} adoptions`}
                  />
                  <Text style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem', fontWeight: 500 }}>
                    {item.month}
                  </Text>
                  <Text style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.25rem' }}>
                    {item.adoptions}
                  </Text>
                </div>
              ))}
            </div>
            <div style={{ paddingTop: '1rem', borderTop: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
              <Text style={{ margin: '0.25rem 0', color: '#4b5563' }}>
                <strong>Total Adoptions: </strong>
                {monthlyAdoptions.reduce((sum, item) => sum + item.adoptions, 0)}
              </Text>
              <Text style={{ margin: '0.25rem 0', color: '#4b5563' }}>
                <strong>Best Month: </strong>
                {monthlyAdoptions.reduce((best, current) => 
                  current.adoptions > best.adoptions ? current : best
                ).month}
              </Text>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: '1.5rem 1.5rem 1rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <Heading level="h3" style={{ margin: 0 }}>Pet Status Distribution</Heading>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {petStatusDistribution.map((status, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div 
                      style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        backgroundColor: status.color,
                        marginRight: '0.75rem'
                      }}
                    />
                    <Text style={{ fontWeight: 500 }}>{status.name}</Text>
                  </div>
                  <Text style={{ 
                    fontWeight: 600, 
                    backgroundColor: '#f3f4f6', 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '12px', 
                    fontSize: '0.875rem' 
                  }}>
                    {status.value}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: '1.5rem 1.5rem 1rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <Heading level="h3" style={{ margin: 0 }}>Recent Activity</Heading>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                <Text style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>2 hours ago</Text>
                <Text style={{ fontSize: '0.875rem', lineHeight: 1.4 }}>New application for Buddy received</Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                <Text style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>4 hours ago</Text>
                <Text style={{ fontSize: '0.875rem', lineHeight: 1.4 }}>Max was adopted by the Johnson family</Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                <Text style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>6 hours ago</Text>
                <Text style={{ fontSize: '0.875rem', lineHeight: 1.4 }}>Luna's medical checkup completed</Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <Text style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>1 day ago</Text>
                <Text style={{ fontSize: '0.875rem', lineHeight: 1.4 }}>New volunteer Sarah joined the team</Text>
              </div>
            </div>
          </div>
        </Card>
      </AnalyticsGrid>

      {/* Notifications */}
      <Card style={{ gridColumn: '1 / -1' }}>
        <div style={{ padding: '1.5rem 1.5rem 1rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <Heading level="h3" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Recent Notifications
            <span style={{ 
              backgroundColor: '#ef4444', 
              color: 'white', 
              fontSize: '0.75rem', 
              fontWeight: 600, 
              padding: '0.25rem 0.5rem', 
              borderRadius: '10px', 
              minWidth: '1.25rem', 
              textAlign: 'center' 
            }}>
              2
            </span>
          </Heading>
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.5rem', backgroundColor: '#eff6ff' }}>
            <div style={{ fontSize: '1.25rem', marginTop: '0.125rem' }}>ℹ️</div>
            <div style={{ flex: 1 }}>
              <Text style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>New Application</Text>
              <Text style={{ color: '#4b5563', fontSize: '0.875rem', lineHeight: 1.4, marginBottom: '0.25rem' }}>New adoption application received for Buddy</Text>
              <Text style={{ color: '#6b7280', fontSize: '0.75rem' }}>2 hours ago</Text>
            </div>
            <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', width: '8px', height: '8px', backgroundColor: '#3b82f6', borderRadius: '50%' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.5rem', backgroundColor: '#eff6ff' }}>
            <div style={{ fontSize: '1.25rem', marginTop: '0.125rem' }}>✅</div>
            <div style={{ flex: 1 }}>
              <Text style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>Successful Adoption</Text>
              <Text style={{ color: '#4b5563', fontSize: '0.875rem', lineHeight: 1.4, marginBottom: '0.25rem' }}>Max has been successfully adopted!</Text>
              <Text style={{ color: '#6b7280', fontSize: '0.75rem' }}>4 hours ago</Text>
            </div>
            <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', width: '8px', height: '8px', backgroundColor: '#3b82f6', borderRadius: '50%' }} />
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
          <button style={{ 
            background: 'none', 
            border: '1px solid #d1d5db', 
            color: '#374151', 
            padding: '0.5rem 1rem', 
            borderRadius: '6px', 
            cursor: 'pointer', 
            fontSize: '0.875rem', 
            fontWeight: 500, 
            transition: 'all 0.2s ease' 
          }}>
            View All Notifications
          </button>
        </div>
      </Card>
    </DashboardContainer>
  );
};

export default Dashboard;
