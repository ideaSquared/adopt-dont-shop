import React from 'react';
import styled from 'styled-components';
import { formatStatusName } from '../../utils/statusUtils';
import StatusBadge from '../common/StatusBadge';
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
  align-items: center;
  gap: 0.25rem;
  min-width: 200px;
`;

const ProgressBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.125rem;
  flex: 1;
`;

const ProgressStep = styled.div<{ $status: 'completed' | 'current' | 'pending'; $isLast?: boolean }>`
  height: 4px;
  flex: 1;
  border-radius: 2px;
  position: relative;
  
  ${props => {
    switch (props.$status) {
      case 'completed':
        return 'background: #10b981;';
      case 'current':
        return 'background: #3b82f6;';
      default:
        return 'background: #e5e7eb;';
    }
  }}
  
  &::after {
    content: '';
    position: absolute;
    right: -3px;
    top: 50%;
    transform: translateY(-50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    ${props => {
      if (props.$isLast) return 'display: none;';
      switch (props.$status) {
        case 'completed':
          return 'background: #10b981; border: 2px solid white; box-shadow: 0 0 0 2px #10b981;';
        case 'current':
          return 'background: #3b82f6; border: 2px solid white; box-shadow: 0 0 0 2px #3b82f6;';
        default:
          return 'background: #9ca3af; border: 2px solid white;';
      }
    }}
  }
`;

const ProgressLabel = styled.span`
  font-size: 0.75rem;
  color: #6b7280;
  margin-left: 0.5rem;
  white-space: nowrap;
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: 0.25rem;
  align-items: center;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 0.375rem;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  
  ${props => {
    switch (props.$variant) {
      case 'primary':
        return `
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
          &:hover { background: #2563eb; border-color: #2563eb; }
        `;
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          border-color: #ef4444;
          &:hover { background: #dc2626; border-color: #dc2626; }
        `;
      default:
        return `
          background: white;
          color: #374151;
          border-color: #d1d5db;
          &:hover { background: #f9fafb; border-color: #9ca3af; }
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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

// Helper functions for progress calculation
const getApplicationProgress = (status: string) => {
  const statusOrder = [
    'draft',
    'submitted', 
    'under_review',
    'pending_references',
    'approved'
  ];
  
  const currentIndex = statusOrder.indexOf(status);
  const progress = currentIndex >= 0 ? currentIndex : 0;
  const total = statusOrder.length - 1; // Don't count final approved as a step
  
  return { current: progress, total, status };
};

const getStepStatus = (stepIndex: number, currentProgress: number, appStatus: string): 'completed' | 'current' | 'pending' => {
  if (appStatus === 'rejected' || appStatus === 'withdrawn' || appStatus === 'expired') {
    return stepIndex <= currentProgress ? 'current' : 'pending';
  }
  
  if (stepIndex < currentProgress) return 'completed';
  if (stepIndex === currentProgress) return 'current';
  return 'pending';
};

const getActionButtons = (application: ApplicationListItem, onStatusUpdate: (id: string, status: string) => void) => {
  const actions = [];
  
  switch (application.status) {
    case 'submitted':
      actions.push(
        { label: 'Start Review', action: () => onStatusUpdate(application.id, 'under_review'), variant: 'primary' as const },
        { label: 'Reject', action: () => onStatusUpdate(application.id, 'rejected'), variant: 'danger' as const }
      );
      break;
    case 'under_review':
      actions.push(
        { label: 'Request References', action: () => onStatusUpdate(application.id, 'pending_references'), variant: 'primary' as const },
        { label: 'Approve', action: () => onStatusUpdate(application.id, 'approved'), variant: 'primary' as const },
        { label: 'Reject', action: () => onStatusUpdate(application.id, 'rejected'), variant: 'danger' as const }
      );
      break;
    case 'pending_references':
      actions.push(
        { label: 'Approve', action: () => onStatusUpdate(application.id, 'approved'), variant: 'primary' as const },
        { label: 'Back to Review', action: () => onStatusUpdate(application.id, 'under_review'), variant: 'secondary' as const }
      );
      break;
    default:
      actions.push(
        { label: 'View', action: () => {}, variant: 'secondary' as const }
      );
  }
  
  return actions.slice(0, 2); // Limit to 2 actions to prevent overflow
};

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
                      <StatusBadge status={application.status || 'unknown'} />
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
                        <ProgressBar>
                          {[0, 1, 2, 3].map((stepIndex) => {
                            const progress = getApplicationProgress(application.status);
                            const stepStatus = getStepStatus(stepIndex, progress.current, application.status);
                            return (
                              <ProgressStep 
                                key={stepIndex}
                                $status={stepStatus}
                                $isLast={stepIndex === 3}
                              />
                            );
                          })}
                        </ProgressBar>
                        <ProgressLabel>
                          {formatStatusName(application.status)}
                        </ProgressLabel>
                      </ProgressIndicators>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <ActionsContainer>
                        {getActionButtons(application, onStatusUpdate).map((action, index) => (
                          <ActionButton
                            key={index}
                            $variant={action.variant}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.action();
                            }}
                          >
                            {action.label}
                          </ActionButton>
                        ))}
                      </ActionsContainer>
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
