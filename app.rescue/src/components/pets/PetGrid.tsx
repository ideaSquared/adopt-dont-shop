import React from 'react';
import clsx from 'clsx';
import { Card, Button, Text } from '@adopt-dont-shop/lib.components';
import { Pet, PetStatus } from '@adopt-dont-shop/lib.pets';
import PetCard from './PetCard.tsx';
import * as styles from './PetGrid.css';

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
  'use memo';
  if (loading && pets.length === 0) {
    return (
      <div className={styles.loadingGrid}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={`skeleton-${index}`} className={styles.loadingCard}>
            <Text>Loading...</Text>
          </Card>
        ))}
      </div>
    );
  }

  if (pets.length === 0) {
    return (
      <div className={styles.gridContainer}>
        <Card className={styles.emptyState}>
          <div className="empty-icon">🐕</div>
          <h3>No pets found</h3>
          <p>Start by adding your first pet to the rescue inventory.</p>
          <Button variant="primary">Add Your First Pet</Button>
        </Card>
      </div>
    );
  }

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) {
      return null;
    }

    const { currentPage, totalPages, hasNext, hasPrev, onPageChange } = pagination;
    const pages: (number | string)[] = [];

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
      <div className={styles.paginationContainer}>
        <Button
          variant="outline"
          disabled={!hasPrev}
          onClick={() => onPageChange(currentPage - 1)}
          className={styles.pageButton}
        >
          ←
        </Button>

        {pages.map((page, index) => (
          <React.Fragment key={`page-${index}`}>
            {page === '...' ? (
              <Text>...</Text>
            ) : (
              <Button
                variant="outline"
                onClick={() => onPageChange(page as number)}
                className={clsx(
                  styles.pageButton,
                  page === currentPage && styles.pageButtonCurrent
                )}
              >
                {page}
              </Button>
            )}
          </React.Fragment>
        ))}

        <Button
          variant="outline"
          disabled={!hasNext}
          onClick={() => onPageChange(currentPage + 1)}
          className={styles.pageButton}
        >
          →
        </Button>

        <Text className={styles.pageCounter}>
          Page {currentPage} of {totalPages}
        </Text>
      </div>
    );
  };

  return (
    <>
      <div className={styles.gridContainer}>
        {pets.map(pet => (
          <PetCard
            key={pet.pet_id}
            pet={pet}
            onStatusChange={onStatusChange}
            onEdit={onEditPet}
            onDelete={onDeletePet}
          />
        ))}
      </div>

      {renderPagination()}
    </>
  );
};

export default PetGrid;
