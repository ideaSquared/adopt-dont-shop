import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import {
  Alert,
  Badge,
  DataTable,
  type DataTableColumn,
  type FilterConfig,
  PageHeader,
  SearchToolbar,
  Stack,
  StatusBadge,
  toast,
  useDebouncedValue,
  useFilterParamSetter,
} from '@adopt-dont-shop/lib.components';
import { formatDisplayDate } from '@adopt-dont-shop/lib.utils';
import { Package } from 'lucide-react';
import { usePets, usePetById, useBulkUpdatePets, useRescuesList } from '../hooks';
import { BulkActionToolbar } from '../components/ui';
import { BulkConfirmationModal } from '../components/modals';
import { PetDetailPanel, EntityDetailLayout } from '../components/detail';
import type { AdminPet, PetStatus } from '../services/petService';
import * as styles from './Pets.css';

type BulkPetActionType = 'publish' | 'unpublish' | 'archive';

// Text users see today; the colour comes from the shared pet status variant.
const PET_STATUS_LABELS: Record<PetStatus, string> = {
  available: 'Available',
  adopted: 'Adopted',
  foster: 'Foster',
  not_available: 'Unavailable',
};

const getStatusBadge = (status: PetStatus, archived: boolean) =>
  archived ? (
    <StatusBadge variant='neutral' label='Archived' />
  ) : (
    <StatusBadge kind='pet' status={status} label={PET_STATUS_LABELS[status] ?? 'Unavailable'} />
  );

const PET_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'rabbit', label: 'Rabbit' },
  { value: 'bird', label: 'Bird' },
  { value: 'reptile', label: 'Reptile' },
  { value: 'other', label: 'Other' },
];

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

  const setFilterParam = useFilterParamSetter(setSearchParams);

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

  // ADS: Deep-link pets via /pets/:petId. Use the row from the loaded list when
  // it is there; otherwise fetch the pet by id, so links from elsewhere open
  // pets on any page. Toast + redirect only when that fetch fails.
  const listedPet = petId ? pets.find(p => p.petId === petId) : undefined;
  const petById = usePetById(petId && !isLoading && !listedPet ? petId : undefined);
  const selectedPet: AdminPet | null = listedPet ?? petById.data ?? null;

  useEffect(() => {
    if (!petId || !petById.isError) {
      return;
    }
    toast.error('Pet not found');
    navigate({ pathname: '/pets', search: searchParams.toString() }, { replace: true });
  }, [petId, petById.isError, navigate, searchParams]);

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
  const filterConfig: FilterConfig[] = [
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'available', label: 'Available' },
        { value: 'adopted', label: 'Adopted' },
        { value: 'foster', label: 'Foster' },
        { value: 'not_available', label: 'Unavailable' },
      ],
    },
    { name: 'type', label: 'Type', type: 'select', options: PET_TYPE_OPTIONS },
    {
      name: 'rescue',
      label: 'Rescue',
      type: 'select',
      options: [
        { value: 'all', label: 'All Rescues' },
        ...(rescuesList?.data.map(rescue => ({ value: rescue.rescueId, label: rescue.name })) ??
          []),
      ],
    },
  ];

  const handleFilterChange = (name: string, value: string | boolean): void => {
    const next = String(value);
    if (name === 'status') {
      setFilterParam('status', next);
    } else if (name === 'type') {
      setTypeFilter(next);
    } else if (name === 'rescue') {
      setRescueFilter(next);
    }
  };

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
          <Badge variant='info'>Featured</Badge>
        ) : (
          <span className={styles.dimDash}>-</span>
        ),
    },
    {
      key: 'createdAt',
      label: 'Listed',
      width: '120px',
      sortable: false,
      render: (_value, row) => formatDisplayDate((row as AdminPet).createdAt),
    },
  ];

  return (
    <Stack spacing='lg'>
      <PageHeader
        title='Pet Management'
        description='Browse and manage all pet listings on the platform'
      />

      {error instanceof Error && (
        <Alert variant='error'>Failed to load pets: {error.message}</Alert>
      )}

      <EntityDetailLayout
        detailOpen={selectedPet !== null}
        onBack={handleDetailClose}
        list={
          <>
            <SearchToolbar
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder='Search by name or breed...'
              filterConfig={filterConfig}
              filters={{ status: statusFilter, type: typeFilter, rescue: rescueFilter }}
              onFilterChange={handleFilterChange}
            />

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
    </Stack>
  );
};

export default Pets;
