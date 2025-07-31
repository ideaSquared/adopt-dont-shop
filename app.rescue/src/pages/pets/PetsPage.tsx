import React, { useState } from 'react';
import styled from 'styled-components';
import { Card, Heading, Text, Button, Container, Badge } from '@adopt-dont-shop/components';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useQuery } from 'react-query';
import { petsService } from '@/services';
import type { Pet, PetSearchFilters } from '@adopt-dont-shop/lib-pets';
import { AddPetModal } from '../../components/modals/AddPetModal';

// Styled Components
const PetsContainer = styled(Container)`
  max-width: 1400px;
  padding: 2rem 1rem;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const FiltersSection = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const PetsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const PetCard = styled(Card)`
  transition: all 0.2s ease-in-out;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const PetImage = styled.div<{ $imageUrl?: string }>`
  height: 200px;
  background: ${props =>
    props.$imageUrl
      ? `url(${props.$imageUrl}) center/cover`
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  border-radius: 8px 8px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.125rem;
  font-weight: 500;
`;

const PetDetails = styled.div`
  padding: 1.5rem;
`;

const PetName = styled(Heading)`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const PetInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1rem 0;
`;

const StatusBadge = styled(Badge)<{ $status: Pet['status'] }>`
  ${props => {
    switch (props.$status) {
      case 'available':
        return 'background-color: #10B981; color: white;';
      case 'pending':
        return 'background-color: #F59E0B; color: white;';
      case 'adopted':
        return 'background-color: #8B5CF6; color: white;';
      case 'on_hold':
        return 'background-color: #6B7280; color: white;';
      case 'medical_care':
        return 'background-color: #EF4444; color: white;';
      default:
        return 'background-color: #6B7280; color: white;';
    }
  }}
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: ${props => props.theme?.text?.secondary || '#6B7280'};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${props => props.theme?.text?.secondary || '#6B7280'};
`;

const ErrorState = styled.div`
  padding: 2rem;
  text-align: center;
  color: ${props => props.theme?.text?.secondary || '#6B7280'};
  background: ${props => props.theme?.background?.secondary || '#F9FAFB'};
  border-radius: 8px;
`;

/**
 * Pets management page for the Rescue App
 * Displays all pets in a grid layout with filtering options
 */
export const PetsPage: React.FC = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [filters, setFilters] = useState<PetSearchFilters>({
    page: 1,
    limit: 12,
  });

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch pets data
  const {
    data: petsData,
    isLoading,
    error,
    refetch,
  } = useQuery(['pets', filters], () => petsService.searchPets(filters), {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  if (!user) {
    return null;
  }

  const handleAddPet = () => {
    setEditingPet(undefined);
    setIsAddModalOpen(true);
  };

  const handlePetClick = (pet: Pet) => {
    setEditingPet(pet);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingPet(undefined);
  };

  const handleSubmitPet = async (data: any) => {
    setIsSubmitting(true);
    try {
      // For now, just log the data - API integration will be added later
      console.log('Pet data:', data);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Close modal and refresh data
      handleCloseModal();
      refetch();
    } catch (error) {
      console.error('Error saving pet:', error);
      // Error handling will be improved later
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusFilter = (status?: Pet['status']) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  };

  const formatAge = (years?: number, months?: number): string => {
    if (!years && !months) return 'Age unknown';
    if (years && months) return `${years}y ${months}m`;
    if (years) return `${years} year${years > 1 ? 's' : ''}`;
    if (months) return `${months} month${months > 1 ? 's' : ''}`;
    return 'Age unknown';
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingState>Loading pets...</LoadingState>;
    }

    if (error) {
      return (
        <ErrorState>
          <Text>Unable to load pets.</Text>
          <Button
            variant='secondary'
            size='sm'
            onClick={() => refetch()}
            style={{ marginTop: '1rem' }}
          >
            Try Again
          </Button>
        </ErrorState>
      );
    }

    // Safely access pets data - handle different response structures
    const pets = petsData?.data || [];

    if (!pets.length) {
      return (
        <EmptyState>
          <Heading level='h3' style={{ marginBottom: '1rem' }}>
            No pets found
          </Heading>
          <Text style={{ marginBottom: '2rem' }}>
            {filters.status || filters.type || filters.search
              ? 'No pets match your current filters.'
              : "You haven't added any pets yet."}
          </Text>
          {hasPermission('pets.create' as const) && (
            <Button variant='primary' onClick={handleAddPet}>
              Add Your First Pet
            </Button>
          )}
        </EmptyState>
      );
    }

    return (
      <PetsGrid>
        {pets.map(pet => (
          <PetCard key={pet.pet_id} onClick={() => handlePetClick(pet)}>
            <PetImage $imageUrl={pet.images?.[0]?.url}>
              {!pet.images?.length && `${pet.name.charAt(0)}`}
            </PetImage>
            <PetDetails>
              <PetName level='h3'>{pet.name}</PetName>
              <Text style={{ color: '#6B7280', marginBottom: '1rem' }}>
                {pet.breed ? `${pet.breed} • ` : ''}
                {pet.type.toLowerCase()} • {formatAge(pet.age_years, pet.age_months)}
              </Text>

              <PetInfo>
                <StatusBadge $status={pet.status}>{pet.status.replace('_', ' ')}</StatusBadge>
                <Badge variant='secondary'>{pet.size}</Badge>
                <Badge variant='secondary'>{pet.gender}</Badge>
              </PetInfo>

              {pet.short_description && (
                <Text
                  style={{
                    fontSize: '0.875rem',
                    color: '#6B7280',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {pet.short_description}
                </Text>
              )}
            </PetDetails>
          </PetCard>
        ))}
      </PetsGrid>
    );
  };

  return (
    <PetsContainer>
      {/* Header Section */}
      <HeaderSection>
        <div>
          <Heading
            level='h1'
            style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}
          >
            Pet Management
          </Heading>
          <Text style={{ fontSize: '1.125rem', color: '#6B7280' }}>
            {(() => {
              const pets = Array.isArray(petsData) ? petsData : petsData?.data || [];
              return pets.length > 0 ? `${pets.length} pets total` : "Manage your rescue's pets";
            })()}
          </Text>
        </div>
        {hasPermission('pets.create' as const) && (
          <Button variant='primary' onClick={handleAddPet}>
            Add New Pet
          </Button>
        )}
      </HeaderSection>

      {/* Filters Section */}
      <FiltersSection>
        <Button
          variant={!filters.status ? 'primary' : 'secondary'}
          size='sm'
          onClick={() => handleStatusFilter()}
        >
          All Status
        </Button>
        <Button
          variant={filters.status === 'available' ? 'primary' : 'secondary'}
          size='sm'
          onClick={() => handleStatusFilter('available')}
        >
          Available
        </Button>
        <Button
          variant={filters.status === 'pending' ? 'primary' : 'secondary'}
          size='sm'
          onClick={() => handleStatusFilter('pending')}
        >
          Pending
        </Button>
        <Button
          variant={filters.status === 'adopted' ? 'primary' : 'secondary'}
          size='sm'
          onClick={() => handleStatusFilter('adopted')}
        >
          Adopted
        </Button>
      </FiltersSection>

      {/* Content */}
      {renderContent()}

      {/* Pagination - temporarily disabled until backend structure is aligned */}
      {/* TODO: Re-enable pagination once backend returns proper structure */}

      {/* Add/Edit Pet Modal */}
      <AddPetModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        pet={editingPet}
        onSubmit={handleSubmitPet}
        isLoading={isSubmitting}
      />
    </PetsContainer>
  );
};
