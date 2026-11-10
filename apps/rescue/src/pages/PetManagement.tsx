import React, { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate, useParams } from 'react-router';
import {
  Alert,
  Container,
  Button,
  ErrorState,
  MetricCard,
  PageHeader,
  toast,
  useFilterParamSetter,
} from '@adopt-dont-shop/lib.components';
import { PetListSkeleton } from '../components/skeletons';
import {
  Pet,
  PetStatus,
  petManagementService,
  type PetCreateData,
  type PetUpdateData,
} from '@adopt-dont-shop/lib.pets';
import { apiService } from '@adopt-dont-shop/lib.api';
import PetGrid from '../components/pets/PetGrid';
import PetFilters from '../components/pets/PetFilters.tsx';
import PetFormModal from '../components/pets/PetFormModal.tsx';
import PetStatusFilter from '../components/pets/PetStatusFilter.tsx';
import PetCsvImportModal from '../components/pets/PetCsvImportModal.tsx';
import PetBulkActionBar, { type PetBulkAction } from '../components/pets/PetBulkActionBar.tsx';
import { usePet } from '../hooks/usePet';
import { useMyRescueId } from '../hooks/useMyRescueId';
import * as styles from './PetManagement.css';

type PetStats = {
  total: number;
  available: number;
  pending: number;
  adopted: number;
  onHold: number;
};

type DashboardStatsResponse = {
  data: {
    totalAnimals?: number;
    availableForAdoption?: number;
    pendingApplications?: number;
    adoptedPets?: number;
  };
};

const NO_PETS: Pet[] = [];
const NO_RESCUE_MESSAGE = 'not associated with a rescue';

// Map dashboard data to our stats format
const fetchPetStats = async (): Promise<PetStats> => {
  // Try to get stats using the dashboard endpoint which works
  const dashboardData = await apiService.get<DashboardStatsResponse>('/api/v1/dashboard/rescue');
  return {
    total: dashboardData.data.totalAnimals || 0,
    available: dashboardData.data.availableForAdoption || 0,
    pending: dashboardData.data.pendingApplications || 0,
    adopted: dashboardData.data.adoptedPets || 0,
    onHold: 0, // Not available in dashboard data
  };
};

const PetManagement: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const rescueId = useMyRescueId();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state is driven by URL search params so refresh/back preserves it.
  const statusFilter = (searchParams.get('status') ?? 'all') as PetStatus | 'all';
  const searchFilter = searchParams.get('search') ?? '';
  const typeFilter = searchParams.get('type') ?? '';
  const sizeFilter = searchParams.get('size') ?? '';
  const breedFilter = searchParams.get('breed') ?? '';
  const ageGroupFilter = searchParams.get('ageGroup') ?? '';
  const genderFilter = searchParams.get('gender') ?? '';

  const setFilterParam = useFilterParamSetter(setSearchParams, { resetPage: true });

  const [actionError, setActionError] = useState<string | null>(null);
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  // A pet deep-linked via /pets/:petId opens in the same form as "Edit".
  const { petId: routePetId } = useParams<{ petId?: string }>();
  const { data: routePet, isError: routePetMissing } = usePet(routePetId);
  const petInForm = editingPet ?? (routePetId ? routePet : undefined) ?? null;

  // A deep link to a pet that no longer exists (or can't be loaded) returns to
  // the list with an explanation rather than silently showing the list.
  useEffect(() => {
    if (!routePetId || !routePetMissing) {
      return;
    }
    toast.error('That pet could not be found');
    navigate('/pets', { replace: true });
  }, [routePetId, routePetMissing, navigate]);

  const closePetForm = () => {
    setShowAddModal(false);
    setEditingPet(null);
    if (routePetId) {
      navigate('/pets');
    }
  };

  // Pagination
  const currentPage = Number(searchParams.get('page') ?? '1');

  // ADS-646: bulk selection state. We hold the set of selected pet IDs at
  // the page level so the toolbar and grid share one source of truth. The
  // result summary is shown inline after a bulk write finishes (success +
  // failure counts) and cleared once the user clears the selection.
  const [selectedPetIds, setSelectedPetIds] = useState<Set<string>>(new Set());
  const [bulkResult, setBulkResult] = useState<{
    successCount: number;
    failedCount: number;
  } | null>(null);

  const listFilters: Parameters<typeof petManagementService.getMyRescuePets>[0] = {
    page: currentPage,
    limit: 12,
    search: searchFilter || undefined,
    sortBy: 'created_at',
    sortOrder: 'DESC' as const,
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(typeFilter && { type: typeFilter }),
    ...(sizeFilter && { size: sizeFilter }),
    ...(breedFilter && { breed: breedFilter }),
    ...(ageGroupFilter && { ageGroup: ageGroupFilter }),
    ...(genderFilter && { gender: genderFilter }),
  };

  // Use getMyRescuePets which automatically determines the rescue ID from authentication
  const petsQuery = useQuery({
    queryKey: ['pets', 'rescue-list', listFilters],
    queryFn: () => petManagementService.getMyRescuePets(listFilters),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: false,
  });
  const statsQuery = useQuery({
    queryKey: ['pets', 'rescue-stats'],
    queryFn: fetchPetStats,
    retry: false,
  });
  const stats = statsQuery.data ?? null;

  const pets = petsQuery.data?.pets ?? NO_PETS;
  const totalPages = petsQuery.data?.pagination.totalPages ?? 1;
  const hasNext = petsQuery.data?.pagination.hasNext ?? false;
  const hasPrev = petsQuery.data?.pagination.hasPrev ?? false;

  const queryErrorMessage = (() => {
    const err = petsQuery.error;
    if (!err) {
      return null;
    }
    if (err instanceof Error && err.message.includes(NO_RESCUE_MESSAGE)) {
      return 'You need to be associated with a rescue organization to manage pets.';
    }
    return err instanceof Error ? err.message : 'Failed to fetch pets';
  })();
  const error = actionError ?? queryErrorMessage;
  const refreshPets = () => queryClient.invalidateQueries({ queryKey: ['pets'] });

  const statusMutation = useMutation({
    mutationFn: ({ petId, status, notes }: { petId: string; status: PetStatus; notes?: string }) =>
      petManagementService.updatePetStatus(petId, status, notes),
    onSuccess: refreshPets,
    // Failures show in the page's own error banner.
    onError: () => undefined,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ petId, reason }: { petId: string; reason?: string }) =>
      petManagementService.deletePet(petId, reason),
    onSettled: refreshPets,
    onError: () => undefined,
  });

  const bulkMutation = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: PetBulkAction }) =>
      action.type === 'status'
        ? petManagementService.bulkUpdatePetStatus(ids, action.status)
        : petManagementService.bulkArchivePets(ids),
    onSettled: refreshPets,
  });

  const saveMutation = useMutation({
    mutationFn: (data: PetCreateData | PetUpdateData) =>
      petInForm
        ? petManagementService.updatePet(petInForm.pet_id, data as PetUpdateData)
        : petManagementService.createPet(data as PetCreateData),
    onSuccess: refreshPets,
  });

  const loading = petsQuery.isFetching || deleteMutation.isPending || statusMutation.isPending;

  const handleStatusChange = async (petId: string, newStatus: PetStatus, notes?: string) => {
    try {
      await statusMutation.mutateAsync({ petId, status: newStatus, notes });
    } catch (err) {
      console.error('Failed to update pet status:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to update pet status');
    }
  };

  const handlePetSaved = () => {
    closePetForm();
  };

  const handleEditPet = (pet: Pet) => {
    setEditingPet(pet);
  };

  const handleDeletePet = async (petId: string, reason?: string) => {
    try {
      await deleteMutation.mutateAsync({ petId, reason });
      // Clear any previous errors
      setActionError(null);
    } catch (err) {
      console.error('Failed to delete pet:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to delete pet');
    }
  };

  const handleToggleSelectPet = (petId: string) => {
    setSelectedPetIds(prev => {
      const next = new Set(prev);
      if (next.has(petId)) {
        next.delete(petId);
      } else {
        next.add(petId);
      }
      return next;
    });
    // A fresh selection invalidates any previous bulk-result banner.
    setBulkResult(null);
  };

  const handleClearSelection = () => {
    setSelectedPetIds(new Set());
    setBulkResult(null);
  };

  const handleBulkAction = async (action: PetBulkAction) => {
    const ids = Array.from(selectedPetIds);
    if (ids.length === 0) {
      return;
    }
    try {
      const result = await bulkMutation.mutateAsync({ ids, action });
      setBulkResult({ successCount: result.successCount, failedCount: result.failedCount });
      setSelectedPetIds(new Set());
      if (result.failedCount === 0) {
        toast.success(`Bulk action applied to ${result.successCount} pets`);
      } else {
        toast.info(`Bulk action: ${result.successCount} succeeded, ${result.failedCount} failed`);
      }
    } catch (err) {
      console.error('Bulk action failed:', err);
      const message = err instanceof Error ? err.message : 'Bulk action failed';
      toast.error(message);
    }
  };

  const handlePageChange = (page: number) => {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (page > 1) {
          next.set('page', String(page));
        } else {
          next.delete('page');
        }
        return next;
      },
      { replace: true }
    );
  };

  if (petsQuery.isLoading) {
    return (
      <Container className={styles.pageContainer}>
        <PageHeader title="Pet Management" />
        <PetListSkeleton />
      </Container>
    );
  }

  if (error && pets.length === 0) {
    return (
      <Container className={styles.pageContainer}>
        <ErrorState
          title="Error Loading Pets"
          message={error}
          onRetry={() => {
            setActionError(null);
            petsQuery.refetch();
          }}
        />
      </Container>
    );
  }

  const visibleError = error !== dismissedError ? error : null;

  return (
    <Container className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        <PageHeader
          title="Pet Management"
          description="Manage your rescue's pet inventory, medical records, and adoption status."
          actions={
            <div className={styles.headerActions}>
              <Button variant="outline" onClick={() => setShowCsvImport(true)} disabled={!rescueId}>
                Import CSV
              </Button>
              <Button variant="primary" onClick={() => setShowAddModal(true)}>
                Add New Pet
              </Button>
            </div>
          }
        />

        {/* Statistics */}
        {stats && (
          <div className={styles.statsContainer}>
            <MetricCard label="Total Pets" value={stats.total} />
            <MetricCard label="Available" value={stats.available} />
            <MetricCard label="Pending" value={stats.pending} />
            <MetricCard label="Adopted" value={stats.adopted} />
            <MetricCard label="On Hold" value={stats.onHold} />
          </div>
        )}

        {/* Filters */}
        <div className={styles.filtersContainer}>
          <div className={styles.statusFilterSection}>
            <PetStatusFilter
              activeStatus={statusFilter === 'all' ? '' : statusFilter}
              statusCounts={
                stats
                  ? {
                      available: stats.available,
                      pending: stats.pending,
                      adopted: stats.adopted,
                      foster: 0, // Not available in dashboard data
                      medical_hold: 0, // Not available in dashboard data
                      behavioral_hold: 0, // Not available in dashboard data
                      not_available: 0, // Not available in dashboard data
                    }
                  : {}
              }
              onStatusChange={status => {
                setFilterParam('status', status);
              }}
            />
          </div>
          <div className={styles.advancedFiltersSection}>
            <PetFilters
              filters={{
                search: searchFilter,
                type: typeFilter,
                status: statusFilter === 'all' ? '' : statusFilter,
                size: sizeFilter,
                breed: breedFilter,
                ageGroup: ageGroupFilter,
                gender: genderFilter,
              }}
              onFilterChange={(key, value) => {
                setFilterParam(key, value);
              }}
              onClearFilters={() => {
                setSearchParams(
                  prev => {
                    const next = new URLSearchParams(prev);
                    // Keep petId if it was the original deep-link param
                    const keepKeys = new Set(['petId']);
                    for (const key of [...next.keys()]) {
                      if (!keepKeys.has(key)) {
                        next.delete(key);
                      }
                    }
                    return next;
                  },
                  { replace: true }
                );
              }}
            />
          </div>
        </div>

        {/* Error Message */}
        {visibleError && (
          <Alert
            variant="error"
            closable
            onClose={() => {
              setActionError(null);
              setDismissedError(visibleError);
            }}
          >
            {visibleError}
          </Alert>
        )}

        {/* Bulk action bar (ADS-646) — only renders while a selection is active. */}
        <PetBulkActionBar
          selectedCount={selectedPetIds.size}
          onClearSelection={handleClearSelection}
          onBulkAction={handleBulkAction}
          busy={bulkMutation.isPending}
          resultSummary={bulkResult}
        />

        {/* Pet Grid */}
        <div className={styles.mainContent}>
          <PetGrid
            pets={pets}
            loading={loading}
            onStatusChange={handleStatusChange}
            onEditPet={handleEditPet}
            onDeletePet={handleDeletePet}
            selectedPetIds={selectedPetIds}
            onToggleSelectPet={handleToggleSelectPet}
            onOpenCsvImport={rescueId ? () => setShowCsvImport(true) : undefined}
            onAddPet={() => setShowAddModal(true)}
            pagination={{
              currentPage,
              totalPages,
              hasNext,
              hasPrev,
              onPageChange: handlePageChange,
            }}
          />
        </div>
      </div>

      {/* CSV Import Modal (ADS-133) */}
      {showCsvImport && rescueId && (
        <PetCsvImportModal
          isOpen={showCsvImport}
          rescueId={rescueId}
          onClose={() => setShowCsvImport(false)}
          onImported={refreshPets}
        />
      )}

      {/* Add/Edit Pet Modal */}
      {(showAddModal || petInForm) && (
        <PetFormModal
          isOpen={showAddModal || !!petInForm}
          pet={petInForm || undefined}
          onClose={closePetForm}
          onSubmit={async data => {
            try {
              await saveMutation.mutateAsync(data);
              handlePetSaved();
              // ADS-125
              toast.success('Pet saved');
            } catch (saveError) {
              console.error('Error saving pet:', saveError);
              throw saveError;
            }
          }}
        />
      )}
    </Container>
  );
};

export default PetManagement;
