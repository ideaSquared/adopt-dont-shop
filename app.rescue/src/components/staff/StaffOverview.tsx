import React from 'react';
import styled from 'styled-components';
import { StaffMember } from '../../types/staff';

interface StaffOverviewProps {
  staff: StaffMember[];
  loading?: boolean;
}

const OverviewContainer = styled.div`
  margin-bottom: 2rem;
`;

const OverviewCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const OverviewCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 480px) {
    flex-direction: column;
    text-align: center;
  }
`;

const CardIcon = styled.div`
  font-size: 2rem;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-radius: 50%;
`;

const CardContent = styled.div`
  h3 {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    color: #1976d2;
  }

  p {
    margin: 0.25rem 0 0 0;
    font-size: 0.875rem;
    color: #666;
    font-weight: 500;
  }
`;

const OverviewDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const DetailSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  h4 {
    margin: 0 0 1rem 0;
    color: #333;
    font-weight: 600;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
`;

const ProgressFill = styled.div<{ width: number }>`
  height: 100%;
  width: ${props => props.width}%;
  background: linear-gradient(90deg, #4caf50 0%, #8bc34a 100%);
  transition: width 0.3s ease;
`;

const ProgressText = styled.p`
  font-size: 0.875rem;
  color: #666;
  margin: 0;
`;

const RoleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const RoleItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
`;

const RoleName = styled.span`
  font-weight: 500;
  color: #333;
`;

const RoleCount = styled.span`
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
`;

const LoadingContainer = styled.div`
  padding: 2rem;
  text-align: center;
`;

const OverviewSkeleton = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const SkeletonCard = styled.div`
  height: 100px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 12px;

  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

const EmptyContainer = styled.div`
  text-align: center;
  padding: 3rem 1rem;
`;

const EmptyMessage = styled.div`
  background: #f8f9fa;
  border-radius: 12px;
  padding: 2rem;
  border: 2px solid #e9ecef;

  h3 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: #666;
  }
`;

const StaffOverview: React.FC<StaffOverviewProps> = ({ staff, loading = false }) => {
  if (loading) {
    return (
      <LoadingContainer>
        <OverviewSkeleton>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </OverviewSkeleton>
      </LoadingContainer>
    );
  }

  const totalStaff = staff.length;
  const verifiedStaff = staff.filter(s => s.isVerified).length;
  const pendingStaff = totalStaff - verifiedStaff;
  const recentStaff = staff.filter(s => {
    const addedDate = new Date(s.addedAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return addedDate >= thirtyDaysAgo;
  }).length;

  const verificationRate = totalStaff > 0 ? Math.round((verifiedStaff / totalStaff) * 100) : 0;

  const roleDistribution = staff.reduce(
    (acc, member) => {
      const role = member.title || 'No Title';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const topRoles = Object.entries(roleDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <OverviewContainer>
      <OverviewCards>
        <OverviewCard>
          <CardIcon>👥</CardIcon>
          <CardContent>
            <h3>{totalStaff}</h3>
            <p>Total Staff</p>
          </CardContent>
        </OverviewCard>

        <OverviewCard>
          <CardIcon>✅</CardIcon>
          <CardContent>
            <h3>{verifiedStaff}</h3>
            <p>Verified</p>
          </CardContent>
        </OverviewCard>

        <OverviewCard>
          <CardIcon>⏳</CardIcon>
          <CardContent>
            <h3>{pendingStaff}</h3>
            <p>Pending</p>
          </CardContent>
        </OverviewCard>

        <OverviewCard>
          <CardIcon>🆕</CardIcon>
          <CardContent>
            <h3>{recentStaff}</h3>
            <p>Added Recently</p>
          </CardContent>
        </OverviewCard>
      </OverviewCards>

      <OverviewDetails>
        <DetailSection>
          <h4>Verification Status</h4>
          <ProgressBar>
            <ProgressFill width={verificationRate} />
          </ProgressBar>
          <ProgressText>{verificationRate}% of staff members are verified</ProgressText>
        </DetailSection>

        {topRoles.length > 0 && (
          <DetailSection>
            <h4>Role Distribution</h4>
            <RoleList>
              {topRoles.map(([role, count]) => (
                <RoleItem key={role}>
                  <RoleName>{role}</RoleName>
                  <RoleCount>{count}</RoleCount>
                </RoleItem>
              ))}
            </RoleList>
          </DetailSection>
        )}
      </OverviewDetails>

      {totalStaff === 0 && (
        <EmptyContainer>
          <EmptyMessage>
            <h3>No Staff Members Yet</h3>
            <p>Start building your team by adding your first staff member.</p>
          </EmptyMessage>
        </EmptyContainer>
      )}
    </OverviewContainer>
  );
};

export default StaffOverview;
