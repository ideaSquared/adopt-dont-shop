import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import {
  DataTable,
  type DataTableColumn,
  Heading,
  Input,
  Text,
  toast,
  useDebouncedValue,
} from '@adopt-dont-shop/lib.components';
import { Package, Search } from 'lucide-react';
import { usePets, useBulkUpdatePets, useRescuesList } from '../hooks';
import { BulkActionToolbar } from '../components/ui';
import { BulkConfirmationModal } from '../components/modals';
import { PetDetailPanel, EntityDetailLayout } from '../components/detail';
import type { AdminPet, PetStatus } from '../services/petService';
import * as styles from './Pets.css';

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

const VALID_PET_STATUS_FILTERS: ReadonlySet<string> = new Set([
  'available',
  'adopted',
  'foster',
  'not_available',
]);

const Pets: React.FC = () => {
  const { petId } = useParams<{ petId?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get('status');
  const statusFilter =
    statusParam && VALID_PET_STATUS_FILTERS.has(statusParam) ? statusParam : 'all';

  const setFilterParam = (key: string, value: string) => {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (value && value !== 'all') {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      },
      { replace: true }
    );
  };

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [rescueFilter, setRescueFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkPetActionType | null>(null);
  const [bulkResult, setBulkResult] = useState<{ succeeded: number; failed: number } | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, statusFilter, typeFilter, rescueFilter]);

  const { data: rescuesList } = useRescuesList();

  const { data, isLoading, error } = usePets({
    search: debouncedSearchQuery || undefined,
    status: statusFilter !== 'all' ? (statusFilter as PetStatus) : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    rescueId: rescueFilter !== 'all' ? rescueFilter : undefined,
    page,
    limit: 20,
  });

  const bulkUpdatePets = useBulkUpdatePets();

  const pets: AdminPet[] = data?.data ?? [];

  // ADS: Deep-link pets via /pets/:petId. Look up the active pet from the loaded
  // list and surface a toast + redirect when an unknown id appears in the URL.
  const selectedPet: AdminPet | null = petId ? (pets.find(p => p.petId === petId) ?? null) : null;

  useEffect(() => {
    if (!petId || isLoading) {
      return;
    }
    if (pets.length === 0) {
      return;
    }
    if (!pets.some(p => p.petId === petId)) {
      toast.error('Pet not found');
      navigate({ pathname: '/pets', search: searchParams.toString() }, { replace: true });
    }
  }, [petId, isLoading, pets, navigate, searchParams]);

  const handleRowClick = (pet: AdminPet): void => {
    navigate({ pathname: `/pets/${pet.petId}`, search: searchParams.toString() });
  };

  const handleDetailClose = (): void => {
    navigate({ pathname: '/pets', search: searchParams.toString() });
  };

  const handleBulkConfirm = async (reason?: string): Promise<void> => {
    if (!bulkAction) {
      return;
    }

    const petIds = Array.from(selectedRows);
    let result: { successCount: number; failedCount: number };

    if (bulkAction === 'archive') {
      result = await bulkUpdatePets.mutateAsync({ petIds, operation: 'archive', reason });
    } else {
      result = await bulkUpdatePets.mutateAsync({
        petIds,
        operation: 'update_status',
        data: { status: bulkAction === 'publish' ? 'available' : 'not_available' },
        reason,
      });
    }

    setBulkResult({ succeeded: result.successCount, failed: result.failedCount });
    setSelectedRows(new Set());
  };

  const handleBulkModalClose = () => {
    setBulkAction(null);
    setBulkResult(null);
  };

  // Columns use the shared DataTable's key/label/render shape. Server-side sort
  // was never wired for pets (the old table's sort only wrote URL params the
  // query ignored), so every column is explicitly non-sortable rather than
  // opting into the shared table's client-side sort of the current page only.
  const columns: DataTableColumn[] = [
    {
      key: 'pet',
      label: 'Pet',
      width: '250px',
      sortable: false,
      render: (_value, row) => {
        const pet = row as AdminPet;
        return (
          <div className={styles.petInfo}>
            <div className={styles.petName}>{pet.name}</div>
            <div className={styles.petDetail}>
              <Package size={12} />
              {pet.type} · {pet.breed}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '130px',
      sortable: false,
      render: (_value, row) => {
        const pet = row as AdminPet;
        return getStatusBadge(pet.status, pet.archived);
      },
    },
    {
      key: 'rescue',
      label: 'Rescue',
      width: '200px',
      sortable: false,
      render: (_value, row) => (row as AdminPet).rescueName ?? '-',
    },
    {
      key: 'featured',
      label: 'Featured',
      width: '100px',
      align: 'center',
      sortable: false,
      render: (_value, row) =>
        (row as AdminPet).featured ? (
          <span className={styles.badgeInfo}>Featured</span>
        ) : (
          <span className={styles.dimDash}>-</span>
        ),
    },
    {
      key: 'createdAt',
      label: 'Listed',
      width: '120px',
      sortable: false,
      render: (_value, row) => formatDate((row as AdminPet).createdAt),
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
        <div className={styles.errorMessage} role='alert'>
          Failed to load pets: {error.message}
        </div>
      )}

      <EntityDetailLayout
        detailOpen={selectedPet !== null}
        onBack={handleDetailClose}
        list={
          <>
            <div className={styles.filterBar}>
              <div className={styles.searchInputWrapper}>
                <Search size='1em' />
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
                  onChange={e => setFilterParam('status', e.target.value)}
                >
                  <option value='all'>All Statuses</option>
                  <option value='available'>Available</option>
                  <option value='adopted'>Adopted</option>
                  <option value='foster'>Foster</option>
                  <option value='not_available'>Unavailable</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel} htmlFor='pets-type-filter'>
                  Type
                </label>
                <select
                  id='pets-type-filter'
                  className={styles.select}
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                >
                  <option value='all'>All Types</option>
                  <option value='dog'>Dog</option>
                  <option value='cat'>Cat</option>
                  <option value='rabbit'>Rabbit</option>
                  <option value='bird'>Bird</option>
                  <option value='reptile'>Reptile</option>
                  <option value='other'>Other</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel} htmlFor='pets-rescue-filter'>
                  Rescue
                </label>
                <select
                  id='pets-rescue-filter'
                  className={styles.select}
                  value={rescueFilter}
                  onChange={e => setRescueFilter(e.target.value)}
                >
                  <option value='all'>All Rescues</option>
                  {rescuesList?.data.map(rescue => (
                    <option key={rescue.rescueId} value={rescue.rescueId}>
                      {rescue.name}
                    </option>
                  ))}
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
              frameless
              surface
              columns={columns}
              rows={pets as unknown as Record<string, unknown>[]}
              loading={isLoading}
              emptyMessage='No pets found matching your criteria'
              page={page}
              total={data?.pagination?.total ?? 0}
              pageSize={20}
              onPageChange={setPage}
              selectable
              selectedIds={selectedRows}
              onSelectionChange={ids => setSelectedRows(new Set(ids))}
              getRowId={row => String((row as AdminPet).petId)}
              onRowClick={row => handleRowClick(row as AdminPet)}
            />
          </>
        }
        detail={selectedPet && <PetDetailPanel pet={selectedPet} onClose={handleDetailClose} />}
      />

      <BulkConfirmationModal
        isOpen={bulkAction !== null}
        onClose={handleBulkModalClose}
        onConfirm={handleBulkConfirm}
        title={(() => {
          const count = selectedRows.size;
          const noun = `${count} pet${count !== 1 ? 's' : ''}`;
          if (bulkAction === 'publish') {
            return `Publish ${noun}?`;
          }
          if (bulkAction === 'unpublish') {
            return `Unpublish ${noun}?`;
          }
          return `Archive ${noun}?`;
        })()}
        description={(() => {
          const count = selectedRows.size;
          const noun = `${count} pet${count !== 1 ? 's' : ''}`;
          if (bulkAction === 'publish') {
            return `This will set ${noun} to available for adoption and they will appear in public listings.`;
          }
          if (bulkAction === 'unpublish') {
            return `This will set ${noun} to unavailable and they will be removed from public listings.`;
          }
          return `This will archive ${noun} and mark them as inactive.`;
        })()}
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
        // ADS-651: every bulk state-change records a reason in the audit log.
        requireReason
        reasonLabel={
          bulkAction === 'publish'
            ? 'Reason for publishing'
            : bulkAction === 'unpublish'
              ? 'Reason for unpublishing'
              : 'Reason for archiving'
        }
        reasonPlaceholder={
          bulkAction === 'publish'
            ? 'Explain why these pets are being published...'
            : bulkAction === 'unpublish'
              ? 'Explain why these pets are being unpublished...'
              : 'Explain why these pets are being archived...'
        }
        isLoading={bulkUpdatePets.isPending}
        resultSummary={bulkResult}
      />
    </div>
  );
};

export default Pets;
