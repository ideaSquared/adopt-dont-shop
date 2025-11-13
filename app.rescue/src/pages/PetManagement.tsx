import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Card, Container, Button, Text, Heading } from '@adopt-dont-shop/components';
import { Pet, PetStatus, petManagementService } from '@adopt-dont-shop/lib-pets';
import { useAuth } from '@adopt-dont-shop/lib-auth';
import { apiService } from '@adopt-dont-shop/lib-api';
import PetGrid from '../components/pets/PetGrid';
import PetFilters from '../components/pets/PetFilters.tsx';
import PetFormModal from '../components/pets/PetFormModal.tsx';
import PetStatusFilter from '../components/pets/PetStatusFilter.tsx';

const PageContainer = styled(Container)`
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 1rem;

  @media (min-width: 768px) {
    padding: 1.5rem;
  }
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (min-width: 768px) {
    gap: 1.25rem;
  }
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const HeaderContent = styled.div`
  flex: 1;

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: ${props => props.theme.text.primary};
    margin: 0 0 0.5rem 0;
  }

  p {
    font-size: 1.1rem;
    color: ${props => props.theme.text.secondary};
    margin: 0;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: stretch;

    button {
      flex: 1;
    }
  }
`;

const FiltersContainer = styled.div`
  margin: 0;
`;

const StatusFilterSection = styled.div`
  margin-bottom: 1rem;
`;

const AdvancedFiltersSection = styled.div`
  margin: 0;
`;

const MainContent = styled.div`
  margin: 0;
  padding: 0;
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const StatCard = styled(Card)`
  padding: 1.5rem;
  text-align: center;

  .stat-number {
    font-size: 2rem;
    font-weight: 700;
    color: ${props => props.theme.colors.primary[600]};
    margin-bottom: 0.5rem;
  }

  .stat-label {
    font-size: 0.875rem;
    color: ${props => props.theme.text.secondary};
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 150px;
  color: ${props => props.theme.text.secondary};
`;

const ErrorContainer = styled(Card)`
  padding: 2rem;
  text-align: center;
  border: 1px solid #ef4444;
  background-color: #fef2f2;
  color: #dc2626;
`;

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

      // Call the API using lib.api
      const result = await apiService.post<any>(
        'http://localhost:5000/api/v1/rescues',
        demoRescueData
      );

      // Now update the user with the rescue ID
      await apiService.patch<any>(`http://localhost:5000/api/v1/users/${user?.userId}`, {
        rescueId: result.data.rescueId,
      });

      // Refresh the user data
      await refreshUser();
      setShowRescueSetup(false);
      alert('Demo rescue created successfully! You can now manage pets.');
    } catch (error) {
      console.error('Error creating demo rescue:', error);
      alert('Failed to create demo rescue. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  const { user, refreshUser } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [stats, setStats] = useState<PetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<PetStatus | 'all'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [sizeFilter, setSizeFilter] = useState<string>('');
  const [breedFilter, setBreedFilter] = useState<string>('');
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const [showRescueSetup, setShowRescueSetup] = useState(false);

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
      setCurrentPage(response.pagination.page);
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
      const dashboardData = await apiService.get<any>(
        'http://localhost:5000/api/v1/dashboard/rescue'
      );

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

  const handleSearch = (searchTerm: string) => {
    setSearchFilter(searchTerm);
    setCurrentPage(1); // Reset to first page
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading && pets.length === 0) {
    return (
      <PageContainer>
        <LoadingContainer>
          <Text>Loading pets...</Text>
        </LoadingContainer>
      </PageContainer>
    );
  }

  if (error && pets.length === 0) {
    return (
      <PageContainer>
        <ErrorContainer>
          <Heading level="h3">Error Loading Pets</Heading>
          <Text>{error}</Text>
          <Button onClick={() => fetchPets()} style={{ marginTop: '1rem' }}>
            Try Again
          </Button>
        </ErrorContainer>
      </PageContainer>
    );
  }

  // Show rescue setup only if we get a specific error about not being associated with a rescue
  if (showRescueSetup && error?.includes('not associated with a rescue')) {
    return (
      <PageContainer>
        <PageHeader>
          <HeaderContent>
            <h1>Rescue Setup Required</h1>
            <p>You need to be associated with a rescue organization to manage pets.</p>
          </HeaderContent>
        </PageHeader>

        <Card
          style={{ padding: '2rem', textAlign: 'center', maxWidth: '600px', margin: '1rem auto' }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏠</div>
          <h2>Create Your Rescue Organization</h2>
          <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
            To start managing pets, you first need to create or join a rescue organization. This
            will allow you to add pets, manage applications, and track adoptions.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={handleCreateDemoRescue} disabled={loading}>
              {loading ? 'Creating...' : 'Create Demo Rescue (Dev)'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Navigate to rescue creation form
                alert('Full rescue registration coming soon. For now, please use the backend API.');
              }}
            >
              Register New Rescue
            </Button>
          </div>

          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#f3f4f6',
              borderRadius: '8px',
            }}
          >
            <strong>Development Note:</strong>
            <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>
              To test the pet management system, you need to:
            </p>
            <ol style={{ textAlign: 'left', fontSize: '0.875rem', margin: 0 }}>
              <li>Create a rescue via API: POST /api/v1/rescues</li>
              <li>Update your user with the rescue ID</li>
              <li>Or use the seed data if available</li>
            </ol>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ContentWrapper>
        <PageHeader>
          <HeaderContent>
            <h1>Pet Management</h1>
            <p>Manage your rescue's pet inventory, medical records, and adoption status.</p>
          </HeaderContent>
          <HeaderActions>
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              Add New Pet
            </Button>
          </HeaderActions>
        </PageHeader>

        {/* Statistics */}
        {stats && (
          <StatsContainer>
            <StatCard>
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total Pets</div>
            </StatCard>
            <StatCard>
              <div className="stat-number">{stats.available}</div>
              <div className="stat-label">Available</div>
            </StatCard>
            <StatCard>
              <div className="stat-number">{stats.pending}</div>
              <div className="stat-label">Pending</div>
            </StatCard>
            <StatCard>
              <div className="stat-number">{stats.adopted}</div>
              <div className="stat-label">Adopted</div>
            </StatCard>
            <StatCard>
              <div className="stat-number">{stats.onHold}</div>
              <div className="stat-label">On Hold</div>
            </StatCard>
          </StatsContainer>
        )}

        {/* Filters */}
        <FiltersContainer>
          <StatusFilterSection>
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
                setStatusFilter(status as any);
              }}
            />
          </StatusFilterSection>
          <AdvancedFiltersSection>
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
                if (key === 'search') {
                  handleSearch(value);
                }
                if (key === 'type') {
                  setTypeFilter(value);
                }
                if (key === 'status') {
                  setStatusFilter(value as any);
                }
                if (key === 'size') {
                  setSizeFilter(value);
                }
                if (key === 'breed') {
                  setBreedFilter(value);
                }
                if (key === 'ageGroup') {
                  setAgeGroupFilter(value);
                }
                if (key === 'gender') {
                  setGenderFilter(value);
                }
              }}
              onClearFilters={() => {
                setSearchFilter('');
                setTypeFilter('');
                setStatusFilter('all');
                setSizeFilter('');
                setBreedFilter('');
                setAgeGroupFilter('');
                setGenderFilter('');
              }}
              onApplyFilters={() => {
                // Filters are applied immediately in this implementation
              }}
            />
          </AdvancedFiltersSection>
        </FiltersContainer>

        {/* Error Message */}
        {error && (
          <ErrorContainer>
            <Text>{error}</Text>
            <Button
              onClick={() => setError(null)}
              variant="outline"
              size="sm"
              style={{ marginTop: '0.5rem' }}
            >
              Dismiss
            </Button>
          </ErrorContainer>
        )}

        {/* Pet Grid */}
        <MainContent>
          <PetGrid
            pets={pets}
            loading={loading}
            onStatusChange={handleStatusChange}
            onEditPet={handleEditPet}
            onDeletePet={handleDeletePet}
            pagination={{
              currentPage,
              totalPages,
              hasNext,
              hasPrev,
              onPageChange: handlePageChange,
            }}
          />
        </MainContent>
      </ContentWrapper>

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
            } catch (error) {
              console.error('Error saving pet:', error);
              throw error;
            }
          }}
        />
      )}
    </PageContainer>
  );
};

export default PetManagement;
