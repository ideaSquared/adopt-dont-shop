import React, { useState } from 'react';
import styled from 'styled-components';
import { Heading, Text, Input } from '@adopt-dont-shop/lib.components';
import { FiSearch, FiPackage } from 'react-icons/fi';
import { DataTable, type Column } from '../components/data';
import { usePets, useBulkUpdatePets } from '../hooks';
import { BulkActionToolbar } from '../components/ui';
import { BulkConfirmationModal } from '../components/modals';
import type { AdminPet, PetStatus } from '../services/petService';

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
      case 'success':
        return '#d1fae5';
      case 'warning':
        return '#fef3c7';
      case 'danger':
        return '#fee2e2';
      case 'info':
        return '#dbeafe';
      default:
        return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$variant) {
      case 'success':
        return '#065f46';
      case 'warning':
        return '#92400e';
      case 'danger':
        return '#991b1b';
      case 'info':
        return '#1e40af';
      default:
        return '#374151';
    }
  }};
`;

const PetInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const PetName = styled.div`
  font-weight: 600;
  color: #111827;
`;

const PetDetail = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ErrorMessage = styled.div`
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 1rem;
  color: #991b1b;
  font-size: 0.875rem;
`;

type BulkPetActionType = 'publish' | 'unpublish' | 'archive';

const getStatusBadge = (status: PetStatus, archived: boolean) => {
  if (archived) {
    return <Badge $variant='neutral'>Archived</Badge>;
  }
  switch (status) {
    case 'available':
      return <Badge $variant='success'>Available</Badge>;
    case 'adopted':
      return <Badge $variant='info'>Adopted</Badge>;
    case 'foster':
      return <Badge $variant='warning'>Foster</Badge>;
    default:
      return <Badge $variant='neutral'>Unavailable</Badge>;
  }
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const Pets: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkPetActionType | null>(null);
  const [bulkResult, setBulkResult] = useState<{ succeeded: number; failed: number } | null>(null);

  const { data, isLoading, error } = usePets({
    search: searchQuery || undefined,
    status: statusFilter !== 'all' ? (statusFilter as PetStatus) : undefined,
    limit: 20,
  });

  const bulkUpdatePets = useBulkUpdatePets();

  const pets: AdminPet[] = data?.data ?? [];

  const handleBulkConfirm = async (): Promise<void> => {
    if (!bulkAction) {
      return;
    }

    const petIds = Array.from(selectedRows);
    let result: { successCount: number; failedCount: number };

    if (bulkAction === 'archive') {
      result = await bulkUpdatePets.mutateAsync({ petIds, operation: 'archive' });
    } else {
      result = await bulkUpdatePets.mutateAsync({
        petIds,
        operation: 'update_status',
        data: { status: bulkAction === 'publish' ? 'available' : 'not_available' },
      });
    }

    setBulkResult({ succeeded: result.successCount, failed: result.failedCount });
    setSelectedRows(new Set());
  };

  const handleBulkModalClose = () => {
    setBulkAction(null);
    setBulkResult(null);
  };

  const columns: Column<AdminPet>[] = [
    {
      id: 'pet',
      header: 'Pet',
      accessor: row => (
        <PetInfo>
          <PetName>{row.name}</PetName>
          <PetDetail>
            <FiPackage size={12} />
            {row.type} · {row.breed}
          </PetDetail>
        </PetInfo>
      ),
      width: '250px',
    },
    {
      id: 'status',
      header: 'Status',
      accessor: row => getStatusBadge(row.status, row.archived),
      width: '130px',
      sortable: true,
    },
    {
      id: 'rescue',
      header: 'Rescue',
      accessor: row => row.rescueName ?? '-',
      width: '200px',
    },
    {
      id: 'featured',
      header: 'Featured',
      accessor: row =>
        row.featured ? (
          <Badge $variant='info'>Featured</Badge>
        ) : (
          <span style={{ color: '#9ca3af' }}>-</span>
        ),
      width: '100px',
      align: 'center',
    },
    {
      id: 'createdAt',
      header: 'Listed',
      accessor: row => formatDate(row.createdAt),
      width: '120px',
      sortable: true,
    },
  ];

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level='h1'>Pet Management</Heading>
          <Text>Browse and manage all pet listings on the platform</Text>
        </HeaderLeft>
      </PageHeader>

      {error && <ErrorMessage>Failed to load pets: {(error as Error).message}</ErrorMessage>}

      <FilterBar>
        <SearchInputWrapper>
          <FiSearch />
          <Input
            type='text'
            placeholder='Search by name or breed...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </SearchInputWrapper>

        <FilterGroup>
          <FilterLabel>Status</FilterLabel>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value='all'>All Statuses</option>
            <option value='available'>Available</option>
            <option value='adopted'>Adopted</option>
            <option value='foster'>Foster</option>
            <option value='not_available'>Unavailable</option>
          </Select>
        </FilterGroup>
      </FilterBar>

      <BulkActionToolbar
        selectedCount={selectedRows.size}
        totalCount={pets.length}
        onSelectAll={() => setSelectedRows(new Set(pets.map((p: AdminPet) => p.petId)))}
        onClearSelection={() => setSelectedRows(new Set())}
        actions={[
          {
            label: 'Publish',
            variant: 'primary',
            onClick: () => setBulkAction('publish'),
          },
          {
            label: 'Unpublish',
            variant: 'warning',
            onClick: () => setBulkAction('unpublish'),
          },
          {
            label: 'Archive',
            variant: 'danger',
            onClick: () => setBulkAction('archive'),
          },
        ]}
      />

      <DataTable
        columns={columns}
        data={pets}
        loading={isLoading}
        emptyMessage='No pets found matching your criteria'
        selectable
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        getRowId={pet => pet.petId}
      />

      <BulkConfirmationModal
        isOpen={bulkAction !== null}
        onClose={handleBulkModalClose}
        onConfirm={handleBulkConfirm}
        title={
          bulkAction === 'publish'
            ? 'Publish Pets'
            : bulkAction === 'unpublish'
              ? 'Unpublish Pets'
              : 'Archive Pets'
        }
        description={
          bulkAction === 'publish'
            ? 'Set the selected pets as available for adoption.'
            : bulkAction === 'unpublish'
              ? 'Set the selected pets as unavailable. They will no longer appear in listings.'
              : 'Archive the selected pets. This marks them as inactive.'
        }
        selectedCount={selectedRows.size}
        confirmLabel={
          bulkAction === 'publish'
            ? 'Publish Pets'
            : bulkAction === 'unpublish'
              ? 'Unpublish Pets'
              : 'Archive Pets'
        }
        variant={
          bulkAction === 'archive' ? 'danger' : bulkAction === 'unpublish' ? 'warning' : 'info'
        }
        isLoading={bulkUpdatePets.isLoading}
        resultSummary={bulkResult}
      />
    </PageContainer>
  );
};

export default Pets;
