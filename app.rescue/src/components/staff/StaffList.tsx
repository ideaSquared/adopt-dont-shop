import React, { useState } from 'react';
import styled from 'styled-components';
import { StaffMember } from '../../types/staff';
import StaffCard from './StaffCard';

interface StaffListProps {
  staff: StaffMember[];
  loading?: boolean;
  onEdit?: (staffMember: StaffMember) => void;
  onRemove?: (staffMember: StaffMember) => void;
  canEdit?: boolean;
  canRemove?: boolean;
  showSearch?: boolean;
  currentUserId?: string; // Add current user ID to prevent self-editing/removal
}

const ListContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const ListControls = styled.div`
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e9ecef;
`;

const SearchFilters = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 200px;
  padding: 0.75rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #1976d2;
  }
`;

const FilterSelect = styled.select`
  padding: 0.75rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #1976d2;
  }
`;

const StaffCount = styled.div`
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
`;

const StaffGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const LoadingContainer = styled.div`
  padding: 2rem;
  text-align: center;
`;

const LoadingSpinner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const Spinner = styled.div`
  width: 2rem;
  height: 2rem;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
`;

const EmptyContainer = styled.div`
  max-width: 400px;
  margin: 0 auto;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const EmptyTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  color: #333;
  font-weight: 600;
`;

const EmptyText = styled.p`
  margin: 0;
  color: #666;
`;

const StaffList: React.FC<StaffListProps> = ({
  staff,
  loading = false,
  onEdit,
  onRemove,
  canEdit = false,
  canRemove = false,
  showSearch = true,
  currentUserId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'verified' | 'pending'>('all');

  const filteredStaff = staff.filter(member => {
    const matchesSearch =
      member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterBy === 'all' ||
      (filterBy === 'verified' && member.isVerified) ||
      (filterBy === 'pending' && !member.isVerified);

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <LoadingContainer>
        <LoadingSpinner>
          <Spinner />
          <p>Loading staff members...</p>
        </LoadingSpinner>
      </LoadingContainer>
    );
  }

  return (
    <ListContainer>
      {showSearch && (
        <ListControls>
          <SearchFilters>
            <SearchInput
              type="text"
              placeholder="Search staff members..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <FilterSelect
              value={filterBy}
              onChange={e => setFilterBy(e.target.value as 'all' | 'verified' | 'pending')}
            >
              <option value="all">All Staff</option>
              <option value="verified">Verified Only</option>
              <option value="pending">Pending Only</option>
            </FilterSelect>
          </SearchFilters>
          <StaffCount>
            Showing {filteredStaff.length} of {staff.length} staff members
          </StaffCount>
        </ListControls>
      )}

      {filteredStaff.length === 0 ? (
        <EmptyState>
          {staff.length === 0 ? (
            <EmptyContainer>
              <EmptyIcon>👥</EmptyIcon>
              <EmptyTitle>No Staff Members</EmptyTitle>
              <EmptyText>Your rescue doesn't have any staff members yet.</EmptyText>
            </EmptyContainer>
          ) : (
            <EmptyContainer>
              <EmptyIcon>🔍</EmptyIcon>
              <EmptyTitle>No Results Found</EmptyTitle>
              <EmptyText>No staff members match your current search criteria.</EmptyText>
            </EmptyContainer>
          )}
        </EmptyState>
      ) : (
        <StaffGrid>
          {filteredStaff.map(staffMember => {
            // Prevent self-editing and self-removal
            const isCurrentUser = staffMember.userId === currentUserId;
            return (
              <StaffCard
                key={staffMember.id}
                staffMember={staffMember}
                onEdit={onEdit}
                onRemove={onRemove}
                canEdit={canEdit && !isCurrentUser}
                canRemove={canRemove && !isCurrentUser}
              />
            );
          })}
        </StaffGrid>
      )}
    </ListContainer>
  );
};

export default StaffList;
