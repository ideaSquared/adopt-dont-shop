import { Spinner } from '@adoptdontshop/components'
import {
  getAdminDashboard,
  getRescueDashboard,
} from '@adoptdontshop/libs/dashboard/DashboardService'
import React, { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import styled from 'styled-components'
import {
  AdminDashboardData,
  RescueDashboardData,
} from '../../libs/dashboard/types'

type DashboardProps = {
  className?: string
  isAdminView?: boolean
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

const DashboardContainer = styled.div`
  padding: 2rem;
  background: ${(props) => props.theme.background.body};
  min-height: 100vh;
`

const DashboardHeader = styled.header`
  margin-bottom: 2rem;
`

const Title = styled.h1`
  font-size: 2rem;
  color: ${(props) => props.theme.text.body};
  margin-bottom: 0.5rem;
`

const Subtitle = styled.p`
  color: ${(props) => props.theme.text.dim};
  font-size: 1.1rem;
`

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`

const Card = styled.div`
  background: ${(props) => props.theme.background.content};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }

  border-color: ${(props) => props.theme.border.color.info};
`

const MetricCard = styled(Card)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  min-height: 160px;
`

const ChartCard = styled(Card)`
  grid-column: span 2;
  min-height: 400px;

  @media (max-width: 1200px) {
    grid-column: span 1;
  }
`

const MetricValue = styled.div`
  font-size: 2.5rem;
  font-weight: bold;
  color: ${(props) => props.theme.text.body};
  margin-bottom: 0.5rem;
  line-height: 1;
`

const MetricLabel = styled.div`
  font-size: 1.1rem;
  color: ${(props) => props.theme.text.dim};
`

const ChartTitle = styled.h2`
  font-size: 1.5rem;
  color: ${(props) => props.theme.text.body};
  margin-bottom: 1.5rem;
`

const AlertCard = styled(Card)<{ severity: 'low' | 'medium' | 'high' }>`
  border-left: 4px solid
    ${({ severity, theme }) =>
      severity === 'high'
        ? theme.text.danger
        : severity === 'medium'
          ? theme.text.warning
          : theme.text.success};
`

const AlertList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`

const AlertItem = styled.li`
  padding: 0.75rem 0;
  border-bottom: 1px solid ${(props) => props.theme.border.color.default};
  color: ${(props) => props.theme.text.dim};

  &:last-child {
    border-bottom: none;
  }
`

const ActivityCard = styled(Card)`
  grid-column: span 2;

  @media (max-width: 1200px) {
    grid-column: span 1;
  }
`

const ActivityList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`

const ActivityItem = styled.li`
  display: flex;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid ${(props) => props.theme.border.color.default};

  &:last-child {
    border-bottom: none;
  }
`

const ActivityIcon = styled.div<{ type: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  background: ${({ type, theme }) =>
    type === 'ERROR'
      ? theme.background.danger
      : type === 'WARNING'
        ? theme.background.warning
        : theme.background.success};
  color: ${({ type, theme }) =>
    type === 'ERROR'
      ? theme.text.danger
      : type === 'WARNING'
        ? theme.text.warning
        : theme.text.success};
`

const ActivityContent = styled.div`
  flex: 1;
`

const ActivityDescription = styled.div`
  color: ${(props) => props.theme.text.body};
  margin-bottom: 0.25rem;
`

const ActivityTime = styled.div`
  color: ${(props) => props.theme.text.dim};
  font-size: 0.875rem;
`

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  color: ${(props) => props.theme.text.danger};
`

export const Dashboard: React.FC<DashboardProps> = ({
  className,
  isAdminView = false,
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adminData, setAdminData] = useState<AdminDashboardData | null>(null)
  const [rescueData, setRescueData] = useState<RescueDashboardData | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        if (isAdminView) {
          const data = await getAdminDashboard()
          setAdminData(data)
        } else {
          const data = await getRescueDashboard()
          setRescueData(data)
        }
      } catch (err) {
        setError('Failed to load dashboard data')
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [isAdminView])

  if (loading) {
    return (
      <DashboardContainer className={className}>
        <div
          style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}
        >
          <Spinner />
        </div>
      </DashboardContainer>
    )
  }

  if (error) {
    return (
      <DashboardContainer className={className}>
        <ErrorContainer>
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
        </ErrorContainer>
      </DashboardContainer>
    )
  }

  if (isAdminView && adminData) {
    return (
      <DashboardContainer
        className={className}
        role="main"
        aria-label="Admin Dashboard"
      >
        <DashboardHeader>
          <Title>Admin Dashboard</Title>
          <Subtitle>Platform overview and key metrics</Subtitle>
        </DashboardHeader>

        <DashboardGrid>
          <MetricCard>
            <MetricValue aria-label="Total Users">
              {adminData.totalUsers.toLocaleString()}
            </MetricValue>
            <MetricLabel>Total Users</MetricLabel>
          </MetricCard>

          <MetricCard>
            <MetricValue aria-label="Active Rescues">
              {adminData.activeRescues}
            </MetricValue>
            <MetricLabel>Active Rescues</MetricLabel>
          </MetricCard>

          <MetricCard>
            <MetricValue aria-label="Monthly Adoptions">
              {adminData.monthlyAdoptions}
            </MetricValue>
            <MetricLabel>Monthly Adoptions</MetricLabel>
          </MetricCard>

          <MetricCard>
            <MetricValue aria-label="Platform Uptime">
              {adminData.platformUptime}%
            </MetricValue>
            <MetricLabel>Platform Uptime</MetricLabel>
          </MetricCard>

          <ChartCard>
            <ChartTitle>Platform Growth</ChartTitle>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={adminData.platformMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#8884d8"
                  name="Users"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="adoptions"
                  stroke="#82ca9d"
                  name="Adoptions"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="rescues"
                  stroke="#ffc658"
                  name="Rescues"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard>
            <ChartTitle>User Distribution</ChartTitle>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={adminData.userDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {adminData.userDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <AlertCard severity="high">
            <ChartTitle>System Alerts</ChartTitle>
            <AlertList>
              <AlertItem>
                {adminData.systemAlerts.pendingVerifications} new rescue
                organizations pending verification
              </AlertItem>
              <AlertItem>
                {adminData.systemAlerts.reportedContent} reported inappropriate
                content items
              </AlertItem>
              <AlertItem>
                {adminData.systemAlerts.userReports} user reports requiring
                moderation
              </AlertItem>
            </AlertList>
          </AlertCard>

          <ActivityCard>
            <ChartTitle>Recent Activity</ChartTitle>
            <ActivityList>
              {adminData.recentActivity.map((activity, index) => (
                <ActivityItem key={index}>
                  <ActivityIcon type={activity.type}>
                    {activity.type === 'ERROR'
                      ? '⚠️'
                      : activity.type === 'WARNING'
                        ? '⚡'
                        : '✓'}
                  </ActivityIcon>
                  <ActivityContent>
                    <ActivityDescription>
                      {activity.description}
                    </ActivityDescription>
                    <ActivityTime>
                      {new Date(activity.timestamp).toLocaleString()}
                    </ActivityTime>
                  </ActivityContent>
                </ActivityItem>
              ))}
            </ActivityList>
          </ActivityCard>
        </DashboardGrid>
      </DashboardContainer>
    )
  }

  if (rescueData) {
    return (
      <DashboardContainer
        className={className}
        role="main"
        aria-label="Rescue Dashboard"
      >
        <DashboardHeader>
          <Title>Rescue Dashboard</Title>
          <Subtitle>Your rescue&apos;s performance at a glance</Subtitle>
        </DashboardHeader>

        <DashboardGrid>
          <MetricCard>
            <MetricValue aria-label="Total Pets">
              {rescueData.totalPets}
            </MetricValue>
            <MetricLabel>Total Pets</MetricLabel>
          </MetricCard>

          <MetricCard>
            <MetricValue aria-label="Successful Adoptions">
              {rescueData.successfulAdoptions}
            </MetricValue>
            <MetricLabel>Successful Adoptions</MetricLabel>
          </MetricCard>

          <MetricCard>
            <MetricValue aria-label="Pending Applications">
              {rescueData.pendingApplications}
            </MetricValue>
            <MetricLabel>Pending Applications</MetricLabel>
          </MetricCard>

          <MetricCard>
            <MetricValue aria-label="Average Rating">
              {rescueData.averageRating.toFixed(1)}
            </MetricValue>
            <MetricLabel>Average Rating</MetricLabel>
          </MetricCard>

          <ChartCard>
            <ChartTitle>Monthly Adoptions</ChartTitle>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rescueData.monthlyAdoptions}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="adoptions" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard>
            <ChartTitle>Pet Status Distribution</ChartTitle>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={rescueData.petStatusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {rescueData.petStatusDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </DashboardGrid>
      </DashboardContainer>
    )
  }

  return null
}
