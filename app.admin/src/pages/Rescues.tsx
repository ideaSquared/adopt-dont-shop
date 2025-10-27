import React, { useState } from 'react';
import styled from 'styled-components';
import { Heading, Text, Button, Input } from '@adopt-dont-shop/components';
import { FiSearch, FiCheckCircle, FiXCircle, FiEye, FiMail, FiMapPin } from 'react-icons/fi';
import { DataTable } from '../components/data';
import type { Column } from '../components/data';
import type { AdminRescue } from '../types/admin';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
`;

const HeaderLeft = styled.div`
  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.5rem 0;
  }

  p {
    font-size: 1rem;
    color: #6b7280;
    margin: 0;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const FilterBar = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 200px;
  flex: 1;
`;

const FilterLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
`;

const SearchInputWrapper = styled.div`
  position: relative;
  flex: 2;
  min-width: 300px;

  svg {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    font-size: 1.125rem;
  }

  input {
    padding-left: 2.5rem;
  }
`;

const Select = styled.select`
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #111827;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #9ca3af;
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }
`;

const Badge = styled.span<{ $variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$variant) {
      case 'success': return '#d1fae5';
      case 'warning': return '#fef3c7';
      case 'danger': return '#fee2e2';
      case 'info': return '#dbeafe';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$variant) {
      case 'success': return '#065f46';
      case 'warning': return '#92400e';
      case 'danger': return '#991b1b';
      case 'info': return '#1e40af';
      default: return '#374151';
    }
  }};
`;

const RescueInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const RescueName = styled.div`
  font-weight: 600;
  color: #111827;
`;

const RescueDetail = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 0.375rem;

  svg {
    font-size: 0.875rem;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    color: #111827;
    border-color: #d1d5db;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const StatsGroup = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.8125rem;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const StatLabel = styled.div`
  color: #6b7280;
`;

const StatValue = styled.div`
  font-weight: 600;
  color: #111827;
`;

// Mock data
const mockRescues: AdminRescue[] = [
  {
    rescueId: '1',
    name: 'Happy Tails Rescue',
    email: 'info@happytails.org',
    phoneNumber: '+44 20 1234 5678',
    address: '123 Main Street',
    city: 'London',
    state: 'Greater London',
    zipCode: 'SW1A 1AA',
    verificationStatus: 'verified',
    ein: '12-3456789',
    website: 'https://happytails.org',
    description: 'Dedicated to rescuing and rehoming dogs in need',
    activeListings: 24,
    staffCount: 8,
    createdAt: '2024-01-15T10:00:00Z',
    verifiedAt: '2024-01-20T10:00:00Z'
  },
  {
    rescueId: '2',
    name: 'Paws & Claws Sanctuary',
    email: 'contact@pawsclaws.org',
    phoneNumber: '+44 161 234 5678',
    address: '456 Oak Avenue',
    city: 'Manchester',
    state: 'Greater Manchester',
    zipCode: 'M1 1AD',
    verificationStatus: 'pending',
    website: 'https://pawsclaws.org',
    description: 'Multi-species rescue focusing on cats and dogs',
    activeListings: 18,
    staffCount: 5,
    createdAt: '2024-10-15T10:00:00Z'
  },
  {
    rescueId: '3',
    name: 'Rural Rescue Network',
    email: 'info@ruralrescue.org',
    phoneNumber: '+44 117 234 5678',
    address: '789 Country Lane',
    city: 'Bristol',
    state: 'Bristol',
    zipCode: 'BS1 1AA',
    verificationStatus: 'verified',
    ein: '98-7654321',
    website: 'https://ruralrescue.org',
    description: 'Serving rural communities across the Southwest',
    activeListings: 42,
    staffCount: 12,
    createdAt: '2023-08-10T10:00:00Z',
    verifiedAt: '2023-08-15T10:00:00Z'
  },
  {
    rescueId: '4',
    name: 'Citywide Animal Welfare',
    email: 'admin@citywideanimal.org',
    phoneNumber: '+44 131 234 5678',
    address: '321 High Street',
    city: 'Edinburgh',
    state: 'Scotland',
    zipCode: 'EH1 1AA',
    verificationStatus: 'rejected',
    website: 'https://citywideanimal.org',
    description: 'Urban rescue specializing in small breeds',
    activeListings: 0,
    staffCount: 3,
    createdAt: '2024-09-20T10:00:00Z',
    rejectedAt: '2024-09-25T10:00:00Z',
    rejectionReason: 'Unable to verify 501(c)(3) status'
  }
];

const Rescues: React.FC = () => {
  const [rescues] = useState<AdminRescue[]>(mockRescues);
  const [loading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter rescues
  const filteredRescues = rescues.filter(rescue => {
    const matchesSearch = searchQuery === '' ||
      rescue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rescue.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rescue.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || rescue.verificationStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge $variant="success">Verified</Badge>;
      case 'pending':
        return <Badge $variant="warning">Pending Review</Badge>;
      case 'rejected':
        return <Badge $variant="danger">Rejected</Badge>;
      default:
        return <Badge $variant="neutral">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const columns: Column<AdminRescue>[] = [
    {
      id: 'rescue',
      header: 'Rescue Organization',
      accessor: (row) => (
        <RescueInfo>
          <RescueName>{row.name}</RescueName>
          <RescueDetail>
            <FiMail />
            {row.email}
          </RescueDetail>
          <RescueDetail>
            <FiMapPin />
            {row.city}, {row.state}
          </RescueDetail>
        </RescueInfo>
      ),
      width: '350px'
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => getStatusBadge(row.verificationStatus),
      width: '140px',
      sortable: true
    },
    {
      id: 'stats',
      header: 'Statistics',
      accessor: (row) => (
        <StatsGroup>
          <StatItem>
            <StatLabel>Listings</StatLabel>
            <StatValue>{row.activeListings}</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Staff</StatLabel>
            <StatValue>{row.staffCount}</StatValue>
          </StatItem>
        </StatsGroup>
      ),
      width: '160px'
    },
    {
      id: 'createdAt',
      header: 'Registered',
      accessor: (row) => formatDate(row.createdAt),
      width: '120px',
      sortable: true
    },
    {
      id: 'verified',
      header: 'Verified',
      accessor: (row) => row.verifiedAt ? formatDate(row.verifiedAt) : '-',
      width: '120px',
      sortable: true
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <ActionButtons onClick={(e) => e.stopPropagation()}>
          <IconButton title="View details">
            <FiEye />
          </IconButton>
          {row.verificationStatus === 'pending' && (
            <>
              <IconButton title="Approve" style={{ color: '#10b981', borderColor: '#10b981' }}>
                <FiCheckCircle />
              </IconButton>
              <IconButton title="Reject" style={{ color: '#ef4444', borderColor: '#ef4444' }}>
                <FiXCircle />
              </IconButton>
            </>
          )}
          <IconButton title="Send email">
            <FiMail />
          </IconButton>
        </ActionButtons>
      ),
      width: '140px',
      align: 'center'
    }
  ];

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level="h1">Rescue Management</Heading>
          <Text>Manage rescue organizations and verification status</Text>
        </HeaderLeft>
        <HeaderActions>
          <Button variant="outline" size="md">
            Export Data
          </Button>
        </HeaderActions>
      </PageHeader>

      <FilterBar>
        <SearchInputWrapper>
          <FiSearch />
          <Input
            type="text"
            placeholder="Search by name, city, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchInputWrapper>

        <FilterGroup>
          <FilterLabel>Verification Status</FilterLabel>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending Review</option>
            <option value="rejected">Rejected</option>
          </Select>
        </FilterGroup>
      </FilterBar>

      <DataTable
        columns={columns}
        data={filteredRescues}
        loading={loading}
        emptyMessage="No rescue organizations found matching your criteria"
        onRowClick={(rescue) => console.log('View rescue:', rescue)}
        getRowId={(rescue) => rescue.rescueId}
      />
    </PageContainer>
  );
};

export default Rescues;
