import React, { useState } from 'react';
import styled from 'styled-components';
import {
  Card,
  CardHeader,
  CardContent,
  Heading,
  Text,
  Button,
  Container,
  Badge,
} from '@adopt-dont-shop/components';
import { usePermissions } from '@/contexts/AuthContext';
import { Permission } from '@/types';
import { 
  FiTrendingUp, 
  FiUsers, 
  FiHeart,
  FiCalendar,
  FiDownload,
  FiFilter
} from 'react-icons/fi';

// Styled Components
const AnalyticsContainer = styled(Container)`
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

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const MetricCard = styled(Card)`
  transition: all 0.2s ease-in-out;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const MetricValue = styled.div<{ color: string }>`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => props.color};
  margin-bottom: 0.5rem;
`;

const MetricLabel = styled.div`
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
`;

const MetricChange = styled.div<{ positive: boolean }>`
  font-size: 0.8rem;
  color: ${props => props.positive ? '#27ae60' : '#e74c3c'};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ChartContainer = styled.div`
  height: 300px;
  background: #f8f9fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  margin-bottom: 1rem;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const TableContainer = styled.div`
  overflow-x: auto;
  margin-top: 1rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const TableHeader = styled.th`
  background: #f8f9fa;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  border-bottom: 1px solid #e9ecef;
`;

const TableCell = styled.td`
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
`;

const TableRow = styled.tr`
  &:hover {
    background: #f8f9fa;
  }
`;

interface AnalyticsData {
  totalPets: number;
  petsAdopted: number;
  pendingApplications: number;
  averageTimeToAdoption: number;
  adoptionRate: number;
  applicationConversionRate: number;
  monthlyAdoptions: MonthlyData[];
  petTypeDistribution: PetTypeData[];
  topPerformingPets: TopPetData[];
  recentAdoptions: RecentAdoptionData[];
}

interface MonthlyData {
  month: string;
  adoptions: number;
  applications: number;
}

interface PetTypeData {
  type: string;
  count: number;
  percentage: number;
}

interface TopPetData {
  pet_id: string;
  name: string;
  type: string;
  applications: number;
  views: number;
  days_listed: number;
}

interface RecentAdoptionData {
  pet_name: string;
  adopter_name: string;
  adoption_date: string;
  days_to_adoption: number;
}

const mockAnalyticsData: AnalyticsData = {
  totalPets: 127,
  petsAdopted: 89,
  pendingApplications: 23,
  averageTimeToAdoption: 28,
  adoptionRate: 70.1,
  applicationConversionRate: 42.3,
  monthlyAdoptions: [
    { month: 'Jan', adoptions: 12, applications: 45 },
    { month: 'Feb', adoptions: 8, applications: 32 },
    { month: 'Mar', adoptions: 15, applications: 52 },
    { month: 'Apr', adoptions: 18, applications: 67 },
    { month: 'May', adoptions: 14, applications: 48 },
    { month: 'Jun', adoptions: 22, applications: 71 },
  ],
  petTypeDistribution: [
    { type: 'Dogs', count: 78, percentage: 61.4 },
    { type: 'Cats', count: 32, percentage: 25.2 },
    { type: 'Rabbits', count: 12, percentage: 9.4 },
    { type: 'Birds', count: 5, percentage: 3.9 },
  ],
  topPerformingPets: [
    { pet_id: '1', name: 'Buddy', type: 'Dog', applications: 12, views: 456, days_listed: 14 },
    { pet_id: '2', name: 'Luna', type: 'Cat', applications: 8, views: 234, days_listed: 21 },
    { pet_id: '3', name: 'Max', type: 'Dog', applications: 7, views: 189, days_listed: 18 },
    { pet_id: '4', name: 'Mia', type: 'Cat', applications: 6, views: 167, days_listed: 25 },
    { pet_id: '5', name: 'Charlie', type: 'Dog', applications: 5, views: 143, days_listed: 32 },
  ],
  recentAdoptions: [
    { pet_name: 'Bella', adopter_name: 'Sarah Johnson', adoption_date: '2025-01-28', days_to_adoption: 12 },
    { pet_name: 'Rocky', adopter_name: 'Mike Chen', adoption_date: '2025-01-26', days_to_adoption: 18 },
    { pet_name: 'Molly', adopter_name: 'Emily Davis', adoption_date: '2025-01-24', days_to_adoption: 15 },
    { pet_name: 'Leo', adopter_name: 'David Wilson', adoption_date: '2025-01-22', days_to_adoption: 28 },
  ],
};

/**
 * AnalyticsPage component for rescue performance analytics
 * Provides comprehensive insights into adoption metrics and trends
 */
export const AnalyticsPage: React.FC = () => {
  const { hasPermission } = usePermissions();
  const [dateRange, setDateRange] = useState('30d');
  const [analyticsData] = useState<AnalyticsData>(mockAnalyticsData);

  const canViewAnalytics = hasPermission(Permission.ANALYTICS_VIEW);

  if (!canViewAnalytics) {
    return (
      <AnalyticsContainer>
        <Card>
          <CardContent style={{ textAlign: 'center', padding: '3rem' }}>
            <Heading level="h3">Access Denied</Heading>
            <Text color="muted">
              You don't have permission to view analytics and reports.
            </Text>
          </CardContent>
        </Card>
      </AnalyticsContainer>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const exportData = () => {
    // TODO: Implement data export functionality
    console.log('Exporting analytics data...');
    alert('Export functionality will be implemented soon!');
  };

  return (
    <AnalyticsContainer>
      <HeaderSection>
        <div>
          <Heading level="h1">Analytics & Reports</Heading>
          <Text color="muted">Insights into your rescue's performance and adoption metrics</Text>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="outline" onClick={exportData}>
            <FiDownload /> Export Data
          </Button>
        </div>
      </HeaderSection>

      {/* Filters Section */}
      <FiltersSection>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FiFilter />
          <Text weight="bold">Time Period:</Text>
        </div>
        <select
          value={dateRange}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDateRange(e.target.value)}
          style={{
            padding: '0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="6m">Last 6 months</option>
          <option value="1y">Last year</option>
          <option value="all">All time</option>
        </select>
      </FiltersSection>

      {/* Key Metrics */}
      <MetricsGrid>
        <MetricCard>
          <CardContent>
            <MetricValue color="#3498db">{analyticsData.totalPets}</MetricValue>
            <MetricLabel>Total Pets</MetricLabel>
            <MetricChange positive={true}>
              <FiTrendingUp /> +12% from last period
            </MetricChange>
          </CardContent>
        </MetricCard>

        <MetricCard>
          <CardContent>
            <MetricValue color="#27ae60">{analyticsData.petsAdopted}</MetricValue>
            <MetricLabel>Pets Adopted</MetricLabel>
            <MetricChange positive={true}>
              <FiHeart /> +8% from last period
            </MetricChange>
          </CardContent>
        </MetricCard>

        <MetricCard>
          <CardContent>
            <MetricValue color="#f39c12">{analyticsData.pendingApplications}</MetricValue>
            <MetricLabel>Pending Applications</MetricLabel>
            <MetricChange positive={false}>
              <FiUsers /> -3% from last period
            </MetricChange>
          </CardContent>
        </MetricCard>

        <MetricCard>
          <CardContent>
            <MetricValue color="#9b59b6">{analyticsData.averageTimeToAdoption}</MetricValue>
            <MetricLabel>Avg. Days to Adoption</MetricLabel>
            <MetricChange positive={true}>
              <FiCalendar /> -2 days improvement
            </MetricChange>
          </CardContent>
        </MetricCard>

        <MetricCard>
          <CardContent>
            <MetricValue color="#e74c3c">{analyticsData.adoptionRate}%</MetricValue>
            <MetricLabel>Adoption Rate</MetricLabel>
            <MetricChange positive={true}>
              <FiTrendingUp /> +5.2% from last period
            </MetricChange>
          </CardContent>
        </MetricCard>

        <MetricCard>
          <CardContent>
            <MetricValue color="#1abc9c">{analyticsData.applicationConversionRate}%</MetricValue>
            <MetricLabel>Application Conversion</MetricLabel>
            <MetricChange positive={true}>
              <FiTrendingUp /> +2.8% from last period
            </MetricChange>
          </CardContent>
        </MetricCard>
      </MetricsGrid>

      {/* Charts */}
      <ChartsGrid>
        <Card>
          <CardHeader>
            <Heading level="h3">Monthly Adoptions vs Applications</Heading>
          </CardHeader>
          <CardContent>
            <ChartContainer>
              <Text color="muted">Chart visualization will be implemented with a charting library</Text>
            </ChartContainer>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              {analyticsData.monthlyAdoptions.map(month => (
                <div key={month.month} style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold' }}>{month.adoptions}</div>
                  <div style={{ color: '#666' }}>{month.month}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Heading level="h3">Pet Type Distribution</Heading>
          </CardHeader>
          <CardContent>
            <ChartContainer>
              <Text color="muted">Pie chart will be implemented with a charting library</Text>
            </ChartContainer>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {analyticsData.petTypeDistribution.map(pet => (
                <div key={pet.type} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{pet.type}</span>
                  <span style={{ fontWeight: 'bold' }}>{pet.percentage}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </ChartsGrid>

      {/* Data Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '1.5rem' }}>
        {/* Top Performing Pets */}
        <Card>
          <CardHeader>
            <Heading level="h3">Top Performing Pets</Heading>
            <Text color="muted">Pets with the most applications and views</Text>
          </CardHeader>
          <CardContent>
            <TableContainer>
              <Table>
                <thead>
                  <tr>
                    <TableHeader>Pet Name</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Applications</TableHeader>
                    <TableHeader>Views</TableHeader>
                    <TableHeader>Days Listed</TableHeader>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.topPerformingPets.map(pet => (
                    <TableRow key={pet.pet_id}>
                      <TableCell style={{ fontWeight: 'bold' }}>{pet.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{pet.type}</Badge>
                      </TableCell>
                      <TableCell>{pet.applications}</TableCell>
                      <TableCell>{pet.views}</TableCell>
                      <TableCell>{pet.days_listed}</TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Recent Adoptions */}
        <Card>
          <CardHeader>
            <Heading level="h3">Recent Adoptions</Heading>
            <Text color="muted">Latest successful adoptions</Text>
          </CardHeader>
          <CardContent>
            <TableContainer>
              <Table>
                <thead>
                  <tr>
                    <TableHeader>Pet Name</TableHeader>
                    <TableHeader>Adopter</TableHeader>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Days to Adopt</TableHeader>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.recentAdoptions.map((adoption, index) => (
                    <TableRow key={index}>
                      <TableCell style={{ fontWeight: 'bold' }}>{adoption.pet_name}</TableCell>
                      <TableCell>{adoption.adopter_name}</TableCell>
                      <TableCell>{formatDate(adoption.adoption_date)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={adoption.days_to_adoption <= 20 ? 'success' : 
                                 adoption.days_to_adoption <= 40 ? 'warning' : 'secondary'}
                        >
                          {adoption.days_to_adoption} days
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </div>
    </AnalyticsContainer>
  );
};
