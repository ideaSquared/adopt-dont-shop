import React from 'react';
import styled from 'styled-components';
import type { ApplicationListItem, ApplicationFilter, ApplicationSort } from '../../types/applications';
import ApplicationStats from './ApplicationStats';
import ApplicationFilters from './ApplicationFilters';

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StatsSection = styled.div`
  margin-bottom: 1rem;
`;

const FiltersSection = styled.div`
  margin-bottom: 1rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Title = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const SelectionCount = styled.span`
  font-size: 0.875rem;
  color: #6b7280;
`;

const SortSelect = styled.select`
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.5rem;
  background: white;
`;

const TableContainer = styled.div`
  background: white;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  border-radius: 0.375rem;
  overflow: hidden;

  @media (max-width: 640px) {
    border-radius: 0.375rem;
  }
`;

const LoadingContainer = styled.div`
  padding: 2rem;
  text-align: center;
`;

const Spinner = styled.div`
  display: inline-block;
  width: 2rem;
  height: 2rem;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
`;

const EmptyContainer = styled.div`
  padding: 2rem;
  text-align: center;
`;

const EmptyText = styled.p`
  color: #6b7280;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  min-width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: #f9fafb;
`;

const TableRow = styled.tr`
  &:hover {
    background: #f9fafb;
  }
  
  cursor: pointer;
`;

const TableHeader = styled.th`
  padding: 0.75rem 1.5rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const TableBody = styled.tbody`
  background: white;
  border-top: 1px solid #e5e7eb;
`;

const TableCell = styled.td`
  padding: 1rem 1.5rem;
  white-space: nowrap;
  border-bottom: 1px solid #e5e7eb;

  &:last-child {
    text-align: right;
  }
`;

const CheckboxCell = styled.td`
  padding: 1rem 1.5rem;
  white-space: nowrap;
  border-bottom: 1px solid #e5e7eb;
`;

const Checkbox = styled.input`
  border-radius: 0.25rem;
  border: 1px solid #d1d5db;
`;

const ApplicantInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const ApplicantName = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
`;

const ApplicantEmail = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const PetInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const PetName = styled.div`
  font-size: 0.875rem;
  color: #111827;
`;

const PetDetails = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
  
  ${props => {
    switch (props.$status) {
      case 'submitted':
        return 'background: #dbeafe; color: #1e40af;';
      case 'under_review':
        return 'background: #fef3c7; color: #92400e;';
      case 'pending_references':
        return 'background: #fed7aa; color: #ea580c;';
      case 'approved':
        return 'background: #dcfce7; color: #166534;';
      case 'rejected':
        return 'background: #fecaca; color: #dc2626;';
      default:
        return 'background: #f3f4f6; color: #374151;';
    }
  }}
`;

const PriorityBadge = styled.span<{ $priority: string }>`
  display: inline-flex;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
  
  ${props => {
    switch (props.$priority) {
      case 'urgent':
        return 'background: #fecaca; color: #dc2626; border: 1px solid #dc2626; animation: pulse 2s infinite;';
      case 'high':
        return 'background: #fed7d7; color: #c53030;';
      case 'medium':
        return 'background: #fef3c7; color: #92400e;';
      case 'low':
        return 'background: #dcfce7; color: #166534;';
      default:
        return 'background: #f3f4f6; color: #374151;';
    }
  }}
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
`;

const ProgressIndicators = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ProgressDot = styled.span<{ $status: string }>`
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  
  ${props => {
    switch (props.$status) {
      case 'completed':
        return 'background: #10b981;';
      case 'in_progress':
      case 'scheduled':
        return 'background: #f59e0b;';
      default:
        return 'background: #d1d5db;';
    }
  }}
`;

const StatusSelect = styled.select`
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.25rem 0.5rem;
`;

const ErrorContainer = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.375rem;
  padding: 1rem;
`;

const ErrorContent = styled.div`
  display: flex;
`;

const ErrorText = styled.div`
  margin-left: 0.75rem;
`;

const ErrorTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 500;
  color: #991b1b;
  margin: 0 0 0.25rem 0;
`;

const ErrorMessage = styled.p`
  font-size: 0.875rem;
  color: #b91c1c;
  margin: 0;
`;

interface ApplicationListProps {
  applications: ApplicationListItem[];
  loading: boolean;
  error: string | null;
  filter: ApplicationFilter;
  sort: ApplicationSort;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onFilterChange: (filter: ApplicationFilter) => void;
  onSortChange: (sort: ApplicationSort) => void;
  onApplicationSelect: (application: ApplicationListItem) => void;
  onStatusUpdate: (id: string, status: string, notes?: string) => void;
  selectedApplications: string[];
  onSelectionChange: (selected: string[]) => void;
}

const ApplicationList: React.FC<ApplicationListProps> = ({
  applications,
  loading,
  error,
  filter,
  sort,
  pagination,
  onFilterChange,
  onSortChange,
  onApplicationSelect,
  onStatusUpdate,
  selectedApplications,
  onSelectionChange
}) => {
  // Convert complex ApplicationFilter to simple string-based filters for UI
  const getDateRangeValue = () => {
    if (!filter.dateRange) return '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const week = new Date();
    week.setDate(week.getDate() - 7);
    const month = new Date();
    month.setMonth(month.getMonth() - 1);
    
    const filterStart = filter.dateRange.start;
    
    // Check if it matches predefined ranges
    if (filterStart.getTime() === today.getTime()) return 'today';
    if (Math.abs(filterStart.getTime() - week.getTime()) < 86400000) return 'week'; // within 1 day
    if (Math.abs(filterStart.getTime() - month.getTime()) < 86400000 * 2) return 'month'; // within 2 days
    
    return 'custom';
  };

  const uiFilters = {
    search: filter.searchQuery || '',
    status: filter.status?.[0] || '',
    priority: filter.priority?.[0] || '',
    petType: filter.petType || '',
    referencesStatus: filter.referencesStatus || '',
    homeVisitStatus: filter.homeVisitStatus || '',
    dateRange: getDateRangeValue(),
    petBreed: filter.petBreed || '',
  };

  // Convert simple string-based filters back to complex ApplicationFilter
  // Only search and status filters actually work for filtering data
  const handleFilterChange = (key: string, value: string) => {
    const newFilter = { ...filter };
    
    switch (key) {
      case 'search':
        newFilter.searchQuery = value || undefined;
        break;
      case 'status':
        newFilter.status = value ? [value as any] : undefined;
        break;
      case 'priority':
        newFilter.priority = value ? [value] : undefined;
        break;
      case 'petType':
        newFilter.petType = value || undefined;
        break;
      case 'referencesStatus':
        newFilter.referencesStatus = value || undefined;
        break;
      case 'homeVisitStatus':
        newFilter.homeVisitStatus = value || undefined;
        break;
      case 'dateRange':
        if (value === 'today') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          newFilter.dateRange = { start: today, end: tomorrow };
        } else if (value === 'week') {
          const week = new Date();
          week.setDate(week.getDate() - 7);
          newFilter.dateRange = { start: week, end: new Date() };
        } else if (value === 'month') {
          const month = new Date();
          month.setMonth(month.getMonth() - 1);
          newFilter.dateRange = { start: month, end: new Date() };
        } else {
          newFilter.dateRange = undefined;
        }
        break;
      case 'petBreed':
        newFilter.petBreed = value || undefined;
        break;
    }
    
    onFilterChange(newFilter);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(applications.map(app => app.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectApplication = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedApplications, id]);
    } else {
      onSelectionChange(selectedApplications.filter(appId => appId !== id));
    }
  };

  if (error) {
    return (
      <ErrorContainer>
        <ErrorContent>
          <ErrorText>
            <ErrorTitle>Error loading applications</ErrorTitle>
            <ErrorMessage>{error}</ErrorMessage>
          </ErrorText>
        </ErrorContent>
      </ErrorContainer>
    );
  }

  return (
    <Container>
      {/* Statistics Section - Always shows full totals */}
      <StatsSection>
        <ApplicationStats />
      </StatsSection>

      {/* Filters Section - Always Visible */}
      <FiltersSection>
        <ApplicationFilters
          filters={uiFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={() => onFilterChange({})}
        />
      </FiltersSection>

      {/* Header and Controls */}
      <Header>
        <HeaderLeft>
          <Title>Applications ({pagination.total})</Title>
        </HeaderLeft>

        <HeaderRight>
          {selectedApplications.length > 0 && (
            <SelectionCount>
              {selectedApplications.length} selected
            </SelectionCount>
          )}
          
          <SortSelect
            value={`${sort.field}-${sort.direction}`}
            onChange={(e) => {
              const [field, direction] = e.target.value.split('-');
              onSortChange({ field: field as any, direction: direction as 'asc' | 'desc' });
            }}
          >
            <option value="submittedAt-desc">Newest First</option>
            <option value="submittedAt-asc">Oldest First</option>
            <option value="status-asc">Status A-Z</option>
            <option value="applicantName-asc">Name A-Z</option>
            <option value="priority-desc">High Priority First</option>
          </SortSelect>
        </HeaderRight>
      </Header>

      {/* Application Table */}
      <TableContainer>
        {loading ? (
          <LoadingContainer>
            <Spinner />
            <LoadingText>Loading applications...</LoadingText>
          </LoadingContainer>
        ) : applications.length === 0 ? (
          <EmptyContainer>
            <EmptyText>No applications found matching your criteria.</EmptyText>
          </EmptyContainer>
        ) : (
          <TableWrapper>
            <Table>
              <TableHead>
                <tr>
                  <TableHeader>
                    <Checkbox
                      type="checkbox"
                      checked={
                        applications.length > 0 &&
                        applications.every(app => selectedApplications.includes(app.id))
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableHeader>
                  <TableHeader>Applicant</TableHeader>
                  <TableHeader>Pet</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Priority</TableHeader>
                  <TableHeader>Submitted</TableHeader>
                  <TableHeader>Progress</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </tr>
              </TableHead>
              <TableBody>
                {applications.map((application) => (
                  <TableRow
                    key={application.id}
                    onClick={() => onApplicationSelect(application)}
                  >
                    <CheckboxCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        type="checkbox"
                        checked={selectedApplications.includes(application.id)}
                        onChange={(e) => handleSelectApplication(application.id, e.target.checked)}
                      />
                    </CheckboxCell>
                    <TableCell>
                      <ApplicantInfo>
                        <ApplicantName>{application.applicantName}</ApplicantName>
                        <ApplicantEmail>{application.data?.personalInfo?.email || 'No email provided'}</ApplicantEmail>
                      </ApplicantInfo>
                    </TableCell>
                    <TableCell>
                      <PetInfo>
                        <PetName>{application.petName || 'Unknown Pet'}</PetName>
                        <PetDetails>{application.petType} • {application.petBreed}</PetDetails>
                      </PetInfo>
                    </TableCell>
                    <TableCell>
                      <StatusBadge $status={application.status}>
                        {application.status ? application.status.replace('_', ' ') : 'Unknown'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge $priority={application.priority}>
                        {application.priority}
                      </PriorityBadge>
                    </TableCell>
                    <TableCell>
                      {application.submittedDaysAgo === 0 ? 'Today' : `${application.submittedDaysAgo} days ago`}
                    </TableCell>
                    <TableCell>
                      <ProgressIndicators>
                        <ProgressDot 
                          $status={application.referencesStatus} 
                          title="References" 
                        />
                        <ProgressDot 
                          $status={application.homeVisitStatus} 
                          title="Home Visit" 
                        />
                      </ProgressIndicators>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <StatusSelect
                        value={application.status}
                        onChange={(e) => onStatusUpdate(application.id, e.target.value)}
                      >
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under Review</option>
                        <option value="pending_references">Pending References</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </StatusSelect>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </TableContainer>
    </Container>
  );
};

export default ApplicationList;
