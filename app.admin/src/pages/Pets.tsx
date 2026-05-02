import React, { useState } from 'react';
import { Heading, Text, Input } from '@adopt-dont-shop/lib.components';
import { FiSearch, FiPackage } from 'react-icons/fi';
import { DataTable, type Column } from '../components/data';
import { usePets, useBulkUpdatePets } from '../hooks';
import { BulkActionToolbar } from '../components/ui';
import { BulkConfirmationModal } from '../components/modals';
import type { AdminPet, PetStatus } from '../services/petService';
import styles from './Pets.css';

type BulkPetActionType = 'publish' | 'unpublish' | 'archive';

const getStatusBadge = (status: PetStatus, archived: boolean) => {
  if (archived) {
    return <span className={styles.badgeNeutral}>Archived</span>;
  }
  switch (status) {
    case 'available':
      return <span className={styles.badgeSuccess}>Available</span>;
    case 'adopted':
      return <span className={styles.badgeInfo}>Adopted</span>;
    case 'foster':
      return <span className={styles.badgeWarning}>Foster</span>;
    default:
      return <span className={styles.badgeNeutral}>Unavailable</span>;
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
        <div className={styles.petInfo}>
          <div className={styles.petName}>{row.name}</div>
          <div className={styles.petDetail}>
            <FiPackage size={12} />
            {row.type} · {row.breed}
          </div>
        </div>
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
          <span className={styles.badgeInfo}>Featured</span>
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
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <Heading level='h1'>Pet Management</Heading>
          <Text>Browse and manage all pet listings on the platform</Text>
        </div>
      </div>

      {error instanceof Error && (
        <div className={styles.errorMessage}>Failed to load pets: {error.message}</div>
      )}

      <div className={styles.filterBar}>
        <div className={styles.searchInputWrapper}>
          <FiSearch />
          <Input
            type='text'
            placeholder='Search by name or breed...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor='pets-status-filter'>
            Status
          </label>
          <select
            id='pets-status-filter'
            className={styles.select}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value='all'>All Statuses</option>
            <option value='available'>Available</option>
            <option value='adopted'>Adopted</option>
            <option value='foster'>Foster</option>
            <option value='not_available'>Unavailable</option>
          </select>
        </div>
      </div>

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
    </div>
  );
};

export default Pets;
