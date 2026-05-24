import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Container, Button, Text, Heading, toast } from '@adopt-dont-shop/lib.components';
import { Pet, PetStatus, petManagementService } from '@adopt-dont-shop/lib.pets';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { apiService } from '@adopt-dont-shop/lib.api';
import PetGrid from '../components/pets/PetGrid';
import PetFilters from '../components/pets/PetFilters.tsx';
import PetFormModal from '../components/pets/PetFormModal.tsx';
import PetStatusFilter from '../components/pets/PetStatusFilter.tsx';
import PetCsvImportModal from '../components/pets/PetCsvImportModal.tsx';
import PetBulkActionBar, { type PetBulkAction } from '../components/pets/PetBulkActionBar.tsx';
import * as styles from './PetManagement.css';

interface PetStats {
  total: number;
  available: number;
  pending: number;
  adopted: number;
  onHold: number;
}

const PetManagement: React.FC = () => {
  const handleCreateDemoRescue = async () => {
    try {
      setLoading(true);

      // Create a demo rescue
      const demoRescueData = {
        name: `${user?.firstName}'s Demo Rescue`,
        email: user?.email || 'demo@rescue.com',
        phone: '555-0123',
        address: '123 Demo Street',
        city: 'Demo City',
        state: 'Demo State',
        zipCode: '12345',
        country: 'United States',
        description: 'A demo rescue organization for testing purposes',
        contactPerson: `${user?.firstName} ${user?.lastName}` || 'Demo Contact',
        contactTitle: 'Rescue Manager',
        contactEmail: user?.email || 'demo@rescue.com',
        contactPhone: '555-0123',
      };

      // Call the API using lib.api (relative path resolves against the
      // configured API base URL, so this works in any environment).
      const result = await apiService.post<any>('/api/v1/rescues', demoRescueData);

      // Now update the user with the rescue ID
      await apiService.patch<any>(`/api/v1/users/${user?.userId}`, {
        rescueId: result.data.rescueId,
      });

      // Refresh the user data
      await refreshUser();
      setShowRescueSetup(false);
      toast.success('Demo rescue created successfully! You can now manage pets.');
    } catch (error) {
      console.error('Error creating demo rescue:', error);
      toast.error('Failed to create demo rescue. Please check the console for details.', {
        action: { label: 'Retry', onClick: handleCreateDemoRescue },
      });
    } finally {
      setLoading(false);
    }
  };

  const { user, refreshUser } = useAuth();
  // ADS-644: cross-linking. When deep-linked via /pets?petId=... we use the
  // petId as the search filter so the matching pet card surfaces immediately.
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state is driven by URL search params so refresh/back preserves it.
  const statusFilter = (searchParams.get('status') ?? 'all') as PetStatus | 'all';
  const searchFilter = searchParams.get('search') ?? searchParams.get('petId') ?? '';
  const typeFilter = searchParams.get('type') ?? '';
  const sizeFilter = searchParams.get('size') ?? '';
  const breedFilter = searchParams.get('breed') ?? '';
  const ageGroupFilter = searchParams.get('ageGroup') ?? '';
  const genderFilter = searchParams.get('gender') ?? '';

  const setFilterParam = (key: string, value: string) => {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (value && value !== 'all') {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        // Reset to page 1 when filters change
        next.delete('page');
        return next;
      },
      { replace: true }
    );
  };

  const [pets, setPets] = useState<Pet[]>([]);
  const [stats, setStats] = useState<PetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);

  // Pagination
  const currentPage = Number(searchParams.get('page') ?? '1');
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const [showRescueSetup, setShowRescueSetup] = useState(false);

  // ADS-646: bulk selection state. We hold the set of selected pet IDs at
  // the page level so the toolbar and grid share one source of truth. The
  // result summary is shown inline after a bulk write finishes (success +
  // failure counts) and cleared once the user clears the selection.
  const [selectedPetIds, setSelectedPetIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    successCount: number;
    failedCount: number;
  } | null>(null);

  const fetchPets = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: any = {
        page: currentPage,
        limit: 12,
        search: searchFilter || undefined,
        sortBy: 'created_at',
        sortOrder: 'DESC' as const,
      };

      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      if (typeFilter) {
        filters.type = typeFilter;
      }

      if (sizeFilter) {
        filters.size = sizeFilter;
      }

      if (breedFilter) {
        filters.breed = breedFilter;
      }

      if (ageGroupFilter) {
        filters.ageGroup = ageGroupFilter;
      }

      if (genderFilter) {
        filters.gender = genderFilter;
      }

      // Use getMyRescuePets which automatically determines the rescue ID from authentication
      const response = await petManagementService.getMyRescuePets(filters);

      setPets(response.pets);
      setTotalPages(response.pagination.totalPages);
      setHasNext(response.pagination.hasNext);
      setHasPrev(response.pagination.hasPrev);
    } catch (err) {
      console.error('Failed to fetch pets:', err);

      // If the error is about not being associated with a rescue, show setup
      if (err instanceof Error && err.message.includes('not associated with a rescue')) {
        setShowRescueSetup(true);
        setError('You need to be associated with a rescue organization to manage pets.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch pets');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Try to get stats using the dashboard endpoint which works
      const dashboardData = await apiService.get<any>('/api/v1/dashboard/rescue');

      // Map dashboard data to our stats format
      setStats({
        total: dashboardData.data.totalAnimals || 0,
        available: dashboardData.data.availableForAdoption || 0,
        pending: dashboardData.data.pendingApplications || 0,
        adopted: dashboardData.data.adoptedPets || 0,
        onHold: 0, // Not available in dashboard data
      });
    } catch (err) {
      console.error('Failed to fetch pet statistics:', err);
    }
  };

  useEffect(() => {
    fetchPets();
  }, [
    currentPage,
    statusFilter,
    searchFilter,
    typeFilter,
    sizeFilter,
    breedFilter,
    ageGroupFilter,
    genderFilter,
  ]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleStatusChange = async (petId: string, newStatus: PetStatus, notes?: string) => {
    try {
      await petManagementService.updatePetStatus(petId, newStatus, notes);
      fetchPets(); // Refresh the list
      fetchStats(); // Refresh stats
    } catch (err) {
      console.error('Failed to update pet status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update pet status');
    }
  };

  const handlePetSaved = () => {
    setShowAddModal(false);
    setEditingPet(null);
    fetchPets();
    fetchStats();
  };

  const handleEditPet = (pet: Pet) => {
    setEditingPet(pet);
  };

  const handleDeletePet = async (petId: string, reason?: string) => {
    setLoading(true);

    try {
      // Optimistically remove the pet from the UI immediately
      setPets(prevPets => prevPets.filter(pet => pet.pet_id !== petId));

      await petManagementService.deletePet(petId, reason);

      // Refresh data to ensure consistency
      await fetchPets();
      await fetchStats();

      // Clear any previous errors
      setError(null);
    } catch (err) {
      console.error('Failed to delete pet:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete pet');
      // If deletion failed, refresh the data to restore the pet in the UI
      await fetchPets();
    } finally {
      setLoading(false);
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
    setBulkBusy(true);
    try {
      const result =
        action.type === 'status'
          ? await petManagementService.bulkUpdatePetStatus(ids, action.status)
          : await petManagementService.bulkArchivePets(ids);
      setBulkResult({ successCount: result.successCount, failedCount: result.failedCount });
      setSelectedPetIds(new Set());
      await fetchPets();
      await fetchStats();
      if (result.failedCount === 0) {
        toast.success(`Bulk action applied to ${result.successCount} pets`);
      } else {
        toast.info(`Bulk action: ${result.successCount} succeeded, ${result.failedCount} failed`);
      }
    } catch (err) {
      console.error('Bulk action failed:', err);
      const message = err instanceof Error ? err.message : 'Bulk action failed';
      toast.error(message);
    } finally {
      setBulkBusy(false);
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

  if (loading && pets.length === 0) {
    return (
      <Container className={styles.pageContainer}>
        <div className={styles.loadingContainer}>
          <Text>Loading pets...</Text>
        </div>
      </Container>
    );
  }

  if (error && pets.length === 0) {
    return (
      <Container className={styles.pageContainer}>
        <div className={styles.errorContainer}>
          <Heading level="h3">Error Loading Pets</Heading>
          <Text>{error}</Text>
          <Button onClick={() => fetchPets()} className={styles.retryButton}>
            Try Again
          </Button>
        </div>
      </Container>
    );
  }

  // Show rescue setup only if we get a specific error about not being associated with a rescue
  if (showRescueSetup && error?.includes('not associated with a rescue')) {
    return (
      <Container className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <h1>Rescue Setup Required</h1>
            <p>You need to be associated with a rescue organization to manage pets.</p>
          </div>
        </div>

        <Card className={styles.setupCard}>
          <div className={styles.setupEmoji}>🏠</div>
          <h2>Create Your Rescue Organization</h2>
          <p className={styles.setupHint}>
            To start managing pets, you first need to create or join a rescue organization. This
            will allow you to add pets, manage applications, and track adoptions.
          </p>

          <div className={styles.setupActions}>
            <Button variant="primary" onClick={handleCreateDemoRescue} disabled={loading}>
              {loading ? 'Creating...' : 'Create Demo Rescue (Dev)'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Navigate to rescue creation form
                toast.info(
                  'Full rescue registration coming soon. For now, please use the backend API.'
                );
              }}
            >
              Register New Rescue
            </Button>
          </div>

          <div className={styles.devNote}>
            <strong>Development Note:</strong>
            <p className={styles.devNoteIntro}>To test the pet management system, you need to:</p>
            <ol className={styles.devNoteSteps}>
              <li>Create a rescue via API: POST /api/v1/rescues</li>
              <li>Update your user with the rescue ID</li>
              <li>Or use the seed data if available</li>
            </ol>
          </div>
        </Card>
      </Container>
    );
  }

  return (
    <Container className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        <div className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <h1>Pet Management</h1>
            <p>Manage your rescue's pet inventory, medical records, and adoption status.</p>
          </div>
          <div className={styles.headerActions}>
            <Button
              variant="outline"
              onClick={() => setShowCsvImport(true)}
              disabled={!user?.rescueId}
            >
              Import CSV
            </Button>
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              Add New Pet
            </Button>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className={styles.statsContainer}>
            <Card className={styles.statCard}>
              <div className={styles.statNumber}>{stats.total}</div>
              <div className={styles.statLabel}>Total Pets</div>
            </Card>
            <Card className={styles.statCard}>
              <div className={styles.statNumber}>{stats.available}</div>
              <div className={styles.statLabel}>Available</div>
            </Card>
            <Card className={styles.statCard}>
              <div className={styles.statNumber}>{stats.pending}</div>
              <div className={styles.statLabel}>Pending</div>
            </Card>
            <Card className={styles.statCard}>
              <div className={styles.statNumber}>{stats.adopted}</div>
              <div className={styles.statLabel}>Adopted</div>
            </Card>
            <Card className={styles.statCard}>
              <div className={styles.statNumber}>{stats.onHold}</div>
              <div className={styles.statLabel}>On Hold</div>
            </Card>
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
        {error && (
          <div className={styles.errorContainer}>
            <Text>{error}</Text>
            <Button
              onClick={() => setError(null)}
              variant="outline"
              size="sm"
              className={styles.dismissButton}
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Bulk action bar (ADS-646) — only renders while a selection is active. */}
        <PetBulkActionBar
          selectedCount={selectedPetIds.size}
          onClearSelection={handleClearSelection}
          onBulkAction={handleBulkAction}
          busy={bulkBusy}
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
            onOpenCsvImport={user?.rescueId ? () => setShowCsvImport(true) : undefined}
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
      {showCsvImport && user?.rescueId && (
        <PetCsvImportModal
          isOpen={showCsvImport}
          rescueId={user.rescueId}
          onClose={() => setShowCsvImport(false)}
          onImported={() => {
            fetchPets();
            fetchStats();
          }}
        />
      )}

      {/* Add/Edit Pet Modal */}
      {(showAddModal || editingPet) && (
        <PetFormModal
          isOpen={showAddModal || !!editingPet}
          pet={editingPet || undefined}
          onClose={() => {
            setShowAddModal(false);
            setEditingPet(null);
          }}
          onSubmit={async data => {
            try {
              if (editingPet) {
                await petManagementService.updatePet(editingPet.pet_id, data as any);
              } else {
                await petManagementService.createPet(data as any);
              }
              handlePetSaved();
              // ADS-125
              toast.success('Pet saved');
            } catch (error) {
              console.error('Error saving pet:', error);
              throw error;
            }
          }}
        />
      )}
    </Container>
  );
};

export default PetManagement;
