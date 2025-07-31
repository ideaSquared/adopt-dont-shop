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
  Input,
  Avatar,
} from '@adopt-dont-shop/components';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { 
  FiSearch, 
  FiPlus, 
  FiEdit3, 
  FiTrash2, 
  FiMail, 
  FiPhone,
  FiCalendar,
  FiActivity 
} from 'react-icons/fi';

// Styled Components
const StaffContainer = styled(Container)`
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

const StaffGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StaffCard = styled(Card)`
  transition: all 0.2s ease-in-out;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const StaffHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const StaffInfo = styled.div`
  flex: 1;
`;

const StaffMeta = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin: 1rem 0;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #666;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const StatsBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
`;

const StatItem = styled.div`
  text-align: center;
  flex: 1;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: #666;
`;

const ActivityIndicator = styled.div<{ active: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${props => props.active ? '#27ae60' : '#95a5a6'};
  margin-left: auto;
`;

interface StaffMember {
  staffMemberId: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'manager' | 'staff' | 'volunteer';
  department?: string;
  joinedAt: string;
  lastActive?: string;
  avatar?: string;
  verified: boolean;
  permissions: string[];
  activityScore?: number;
}

const getRoleColor = (role: string): 'primary' | 'secondary' | 'success' | 'warning' => {
  switch (role) {
    case 'admin':
      return 'warning';
    case 'manager':
      return 'secondary';
    case 'staff':
      return 'primary';
    case 'volunteer':
      return 'success';
    default:
      return 'secondary';
  }
};

const getRoleName = (role: string) => {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'manager':
      return 'Manager';
    case 'staff':
      return 'Staff Member';
    case 'volunteer':
      return 'Volunteer';
    default:
      return role;
  }
};

const mockStaffMembers: StaffMember[] = [
  {
    staffMemberId: '1',
    userId: 'user-1',
    name: 'Sarah Mitchell',
    email: 'sarah.mitchell@rescue.org',
    phone: '+1 (555) 123-4567',
    role: 'admin',
    department: 'Operations',
    joinedAt: '2024-01-15T00:00:00Z',
    lastActive: '2025-01-29T08:30:00Z',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150',
    verified: true,
    permissions: ['MANAGE_PETS', 'MANAGE_APPLICATIONS', 'MANAGE_STAFF', 'VIEW_ANALYTICS'],
    activityScore: 95,
  },
  {
    staffMemberId: '2',
    userId: 'user-2',
    name: 'David Rodriguez',
    email: 'david.rodriguez@rescue.org',
    phone: '+1 (555) 234-5678',
    role: 'manager',
    department: 'Animal Care',
    joinedAt: '2024-03-10T00:00:00Z',
    lastActive: '2025-01-29T07:45:00Z',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    verified: true,
    permissions: ['MANAGE_PETS', 'MANAGE_APPLICATIONS', 'VIEW_ANALYTICS'],
    activityScore: 88,
  },
  {
    staffMemberId: '3',
    userId: 'user-3',
    name: 'Emily Chen',
    email: 'emily.chen@rescue.org',
    role: 'staff',
    department: 'Adoptions',
    joinedAt: '2024-06-20T00:00:00Z',
    lastActive: '2025-01-28T16:20:00Z',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    verified: true,
    permissions: ['MANAGE_APPLICATIONS', 'VIEW_PETS'],
    activityScore: 92,
  },
  {
    staffMemberId: '4',
    userId: 'user-4',
    name: 'Mike Johnson',
    email: 'mike.johnson@volunteer.com',
    role: 'volunteer',
    department: 'Events',
    joinedAt: '2024-08-05T00:00:00Z',
    lastActive: '2025-01-27T14:15:00Z',
    verified: false,
    permissions: ['VIEW_PETS'],
    activityScore: 76,
  },
];

/**
 * StaffPage component for managing rescue staff and volunteers
 * Provides staff directory, role management, and activity tracking
 */
export const StaffPage: React.FC = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Mock data - replace with real API calls
  const staffMembers = mockStaffMembers;
  const departments = Array.from(new Set(staffMembers.map(s => s.department).filter(Boolean)));

  const stats = {
    total: staffMembers.length,
    admins: staffMembers.filter(s => s.role === 'admin').length,
    managers: staffMembers.filter(s => s.role === 'manager').length,
    staff: staffMembers.filter(s => s.role === 'staff').length,
    volunteers: staffMembers.filter(s => s.role === 'volunteer').length,
    active: staffMembers.filter(s => s.lastActive && isRecentlyActive(s.lastActive)).length,
    unverified: staffMembers.filter(s => !s.verified).length,
  };

  function isRecentlyActive(lastActive: string): boolean {
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24; // Active within last 24 hours
  }

  const filteredStaffMembers = staffMembers.filter(member => {
    const matchesSearch = searchTerm === '' || 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.department && member.department.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesDepartment = departmentFilter === 'all' || member.department === departmentFilter;

    return matchesSearch && matchesRole && matchesDepartment;
  });

  const handleEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
  };

  const handleDeleteStaff = (staffId: string) => {
    // TODO: Implement delete logic with confirmation
    console.log('Deleting staff member:', staffId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <StaffContainer>
      <HeaderSection>
        <div>
          <Heading level="h1">Staff & Volunteers</Heading>
          <Text color="muted">Manage your rescue team members and volunteers</Text>
        </div>
        {hasPermission('users.update' as const) && (
          <Button onClick={() => setShowAddModal(true)}>
            <FiPlus /> Add Staff Member
          </Button>
        )}
      </HeaderSection>

      {/* Statistics Bar */}
      <StatsBar>
        <StatItem>
          <StatValue>{stats.total}</StatValue>
          <StatLabel>Total Members</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{stats.admins}</StatValue>
          <StatLabel>Administrators</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{stats.managers}</StatValue>
          <StatLabel>Managers</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{stats.staff}</StatValue>
          <StatLabel>Staff</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{stats.volunteers}</StatValue>
          <StatLabel>Volunteers</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{stats.active}</StatValue>
          <StatLabel>Active Today</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{stats.unverified}</StatValue>
          <StatLabel>Unverified</StatLabel>
        </StatItem>
      </StatsBar>

      {/* Filters Section */}
      <FiltersSection>
        <SearchContainer>
          <SearchIcon />
          <SearchInput
            placeholder="Search by name, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchContainer>

        <select
          value={roleFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRoleFilter(e.target.value)}
          style={{
            padding: '0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}
        >
          <option value="all">All Roles</option>
          <option value="admin">Administrators</option>
          <option value="manager">Managers</option>
          <option value="staff">Staff</option>
          <option value="volunteer">Volunteers</option>
        </select>

        <select
          value={departmentFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDepartmentFilter(e.target.value)}
          style={{
            padding: '0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}
        >
          <option value="all">All Departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </FiltersSection>

      {/* Staff Grid */}
      <StaffGrid>
        {filteredStaffMembers.map((member) => (
          <StaffCard key={member.staffMemberId}>
            <CardHeader>
              <StaffHeader>
                <Avatar
                  src={member.avatar}
                  alt={member.name}
                  size="lg"
                />
                <StaffInfo>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Heading level="h4">{member.name}</Heading>
                    {!member.verified && (
                      <Badge variant="warning" size="sm">Unverified</Badge>
                    )}
                  </div>
                  <Text color="muted" size="sm">{member.email}</Text>
                  <Badge variant={getRoleColor(member.role)} size="sm">
                    {getRoleName(member.role)}
                  </Badge>
                </StaffInfo>
                <ActivityIndicator 
                  active={member.lastActive ? isRecentlyActive(member.lastActive) : false}
                />
              </StaffHeader>
            </CardHeader>

            <CardContent>
              <StaffMeta>
                {member.department && (
                  <MetaItem>
                    <FiActivity />
                    <Text size="sm">{member.department}</Text>
                  </MetaItem>
                )}
                
                {member.phone && (
                  <MetaItem>
                    <FiPhone />
                    <Text size="sm">{member.phone}</Text>
                  </MetaItem>
                )}

                <MetaItem>
                  <FiCalendar />
                  <Text size="sm">Joined {formatDate(member.joinedAt)}</Text>
                </MetaItem>

                {member.lastActive && (
                  <MetaItem>
                    <FiActivity />
                    <Text size="sm">Active {formatLastActive(member.lastActive)}</Text>
                  </MetaItem>
                )}
              </StaffMeta>

              {member.activityScore && (
                <div style={{ marginBottom: '1rem' }}>
                  <Text size="sm" color="muted">Activity Score</Text>
                  <div style={{ 
                    width: '100%', 
                    height: '8px', 
                    backgroundColor: '#e9ecef', 
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginTop: '4px'
                  }}>
                    <div 
                      style={{ 
                        width: `${member.activityScore}%`, 
                        height: '100%', 
                        backgroundColor: member.activityScore >= 80 ? '#27ae60' : 
                                       member.activityScore >= 60 ? '#f39c12' : '#e74c3c',
                        transition: 'width 0.3s ease'
                      }} 
                    />
                  </div>
                  <Text size="sm" color="muted">{member.activityScore}%</Text>
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <Text size="sm" color="muted" style={{ marginBottom: '0.5rem' }}>
                  Permissions ({member.permissions.length})
                </Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                  {member.permissions.slice(0, 3).map(permission => (
                    <Badge key={permission} variant="outline" size="sm">
                      {permission.replace('_', ' ')}
                    </Badge>
                  ))}
                  {member.permissions.length > 3 && (
                    <Badge variant="outline" size="sm">
                      +{member.permissions.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>

              {hasPermission('users.update' as const) && (
                <ActionButtons>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditStaff(member)}
                  >
                    <FiEdit3 /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`mailto:${member.email}`)}
                  >
                    <FiMail /> Email
                  </Button>
                  {user?.userId !== member.userId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteStaff(member.staffMemberId)}
                    >
                      <FiTrash2 /> Remove
                    </Button>
                  )}
                </ActionButtons>
              )}
            </CardContent>
          </StaffCard>
        ))}
      </StaffGrid>

      {filteredStaffMembers.length === 0 && (
        <Card>
          <CardContent style={{ textAlign: 'center', padding: '3rem' }}>
            <Heading level="h3">No staff members found</Heading>
            <Text color="muted">
              {searchTerm || roleFilter !== 'all' || departmentFilter !== 'all'
                ? 'Try adjusting your filters to see more staff members.'
                : 'No staff members have been added yet.'}
            </Text>
          </CardContent>
        </Card>
      )}

      {/* TODO: Add Staff and Edit Staff Modals */}
      {showAddModal && (
        <div>Add Staff Modal - To be implemented</div>
      )}

      {editingStaff && (
        <div>Edit Staff Modal - To be implemented</div>
      )}
    </StaffContainer>
  );
};
