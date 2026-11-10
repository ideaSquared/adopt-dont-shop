import React from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  DataTable,
  type DataTableColumn,
  DateTime,
  ErrorState,
  Skeleton,
} from '@adopt-dont-shop/lib.components';
import * as styles from '../RescueDetailModal.css';
import { petService, type AdminPet } from '@/services/petService';

type ListingsTabProps = {
  rescueId: string;
};

const RECENT_LIMIT = 5;

const RECENT_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: false },
  { key: 'type', label: 'Type', sortable: false },
  { key: 'breed', label: 'Breed', sortable: false },
  {
    key: 'createdAt',
    label: 'Listed',
    sortable: false,
    render: value => <DateTime timestamp={String(value)} />,
  },
];

export const ListingsTab: React.FC<ListingsTabProps> = ({ rescueId }) => {
  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['pets', 'by-rescue', rescueId],
    queryFn: () => petService.getAll({ rescueId, limit: 100 }),
  });
  const pets: AdminPet[] = data?.data ?? [];
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : 'Failed to load listings'
    : null;

  const counts = pets.reduce(
    (acc, pet) => {
      if (pet.archived) {
        acc.archived += 1;
      } else if (pet.status === 'available') {
        acc.available += 1;
      } else if (pet.status === 'adopted') {
        acc.adopted += 1;
      } else if (pet.status === 'foster') {
        acc.foster += 1;
      } else {
        acc.other += 1;
      }
      return acc;
    },
    { available: 0, adopted: 0, foster: 0, archived: 0, other: 0 }
  );

  const recent = [...pets]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, RECENT_LIMIT);

  return (
    <>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Listings Summary</h3>

        {error && <ErrorState message={error} onRetry={() => void refetch()} />}

        {loading && (
          <div aria-label='Loading listings' className={styles.skeletonRow}>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} height='4rem' width='8rem' />
            ))}
          </div>
        )}

        {!loading && !error && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Available</div>
              <div className={styles.statValue}>{counts.available}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Adopted</div>
              <div className={styles.statValue}>{counts.adopted}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Foster</div>
              <div className={styles.statValue}>{counts.foster}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Archived</div>
              <div className={styles.statValue}>{counts.archived}</div>
            </div>
          </div>
        )}
      </div>

      {!loading && !error && recent.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Recent Listings</h3>
          <DataTable
            frameless
            columns={RECENT_COLUMNS}
            rows={recent.map(pet => ({ ...pet }))}
            getRowId={(_row, index) => recent[index]?.petId ?? String(index)}
          />
          <div className={styles.manageLinkRow}>
            <Link to='/pets'>Manage all pets →</Link>
          </div>
        </div>
      )}

      {!loading && !error && pets.length === 0 && (
        <div className={styles.section}>
          <div className={styles.infoValue}>No pet listings for this rescue.</div>
        </div>
      )}
    </>
  );
};
