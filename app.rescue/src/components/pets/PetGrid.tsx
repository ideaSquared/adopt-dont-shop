import React from 'react';
import styled from 'styled-components';
import { Card, Button, Text } from '@adopt-dont-shop/lib.components';
import { Pet, PetStatus } from '@adopt-dont-shop/lib.pets';
import PetCard from './PetCard.tsx';

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 0;
  margin-top: 0;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.25rem;
  }
`;

const EmptyState = styled(Card)`
  padding: 3rem;
  text-align: center;
  grid-column: 1 / -1;

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  h3 {
    margin-bottom: 0.5rem;
    color: ${props => props.theme.text.primary};
  }

  p {
    color: ${props => props.theme.text.secondary};
    margin-bottom: 1.5rem;
  }
`;

const LoadingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 0;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
  }
`;

const LoadingCard = styled(Card)`
  padding: 1rem;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;

  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1rem;

  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
`;

const PageButton = styled(Button)<{ active?: boolean }>`
  min-width: 40px;
  height: 40px;
  padding: 0.5rem;
  ${props =>
    props.active &&
    `
    background-color: ${props.theme.colors.primary[600]};
    color: white;
  `}
`;

const PageInfo = styled(Text)`
  font-size: 0.875rem;
  color: ${props => props.theme.text.secondary};
  white-space: nowrap;
`;

interface PetGridProps {
  pets: Pet[];
  loading?: boolean;
  onStatusChange: (petId: string, status: PetStatus, notes?: string) => void;
  onEditPet: (pet: Pet) => void;
  onDeletePet: (petId: string, reason?: string) => Promise<void>;
  pagination?: {
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    onPageChange: (page: number) => void;
  };
}

const PetGrid: React.FC<PetGridProps> = ({
  pets,
  loading = false,
  onStatusChange,
  onEditPet,
  onDeletePet,
  pagination,
}) => {
  if (loading && pets.length === 0) {
    return (
      <LoadingGrid>
        {Array.from({ length: 6 }).map((_, index) => (
          <LoadingCard key={index}>
            <Text>Loading...</Text>
          </LoadingCard>
        ))}
      </LoadingGrid>
    );
  }

  if (pets.length === 0) {
    return (
      <GridContainer>
        <EmptyState>
          <div className="empty-icon">🐕</div>
          <h3>No pets found</h3>
          <p>Start by adding your first pet to the rescue inventory.</p>
          <Button variant="primary">Add Your First Pet</Button>
        </EmptyState>
      </GridContainer>
    );
  }

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) {
      return null;
    }

    const { currentPage, totalPages, hasNext, hasPrev, onPageChange } = pagination;
    const pages = [];

    // Always show first page
    if (currentPage > 3) {
      pages.push(1);
      if (currentPage > 4) {
        pages.push('...');
      }
    }

    // Show pages around current page
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      pages.push(i);
    }

    // Always show last page
    if (currentPage < totalPages - 2) {
      if (currentPage < totalPages - 3) {
        pages.push('...');
      }
      pages.push(totalPages);
    }

    return (
      <PaginationContainer>
        <PageButton
          variant="outline"
          disabled={!hasPrev}
          onClick={() => onPageChange(currentPage - 1)}
        >
          ←
        </PageButton>

        {pages.map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <Text>...</Text>
            ) : (
              <PageButton
                variant="outline"
                active={page === currentPage}
                onClick={() => onPageChange(page as number)}
              >
                {page}
              </PageButton>
            )}
          </React.Fragment>
        ))}

        <PageButton
          variant="outline"
          disabled={!hasNext}
          onClick={() => onPageChange(currentPage + 1)}
        >
          →
        </PageButton>

        <PageInfo>
          Page {currentPage} of {totalPages}
        </PageInfo>
      </PaginationContainer>
    );
  };

  return (
    <>
      <GridContainer>
        {pets.map(pet => (
          <PetCard
            key={pet.pet_id}
            pet={pet}
            onStatusChange={onStatusChange}
            onEdit={onEditPet}
            onDelete={onDeletePet}
          />
        ))}
      </GridContainer>

      {renderPagination()}
    </>
  );
};

export default PetGrid;
