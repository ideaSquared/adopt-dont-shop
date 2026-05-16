import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DateTime } from '@adopt-dont-shop/lib.components';
import { Skeleton } from '../../ui/Skeleton';
import * as styles from '../RescueDetailModal.css';
import { petService, type AdminPet } from '@/services/petService';

type ListingsTabProps = {
  rescueId: string;
};

const RECENT_LIMIT = 5;

export const ListingsTab: React.FC<ListingsTabProps> = ({ rescueId }) => {
  const [pets, setPets] = useState<AdminPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await petService.getAll({ rescueId, limit: 100 });
        if (!cancelled) {
          setPets(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load listings');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rescueId]);

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

        {error && <div className={styles.errorMessage}>{error}</div>}

        {loading && (
          <div aria-label='Loading listings' style={{ display: 'flex', gap: '0.5rem' }}>
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '0.5rem' }}>Name</th>
                  <th style={{ padding: '0.5rem' }}>Type</th>
                  <th style={{ padding: '0.5rem' }}>Breed</th>
                  <th style={{ padding: '0.5rem' }}>Listed</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(pet => (
                  <tr key={pet.petId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.5rem' }}>{pet.name}</td>
                    <td style={{ padding: '0.5rem' }}>{pet.type}</td>
                    <td style={{ padding: '0.5rem' }}>{pet.breed}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <DateTime timestamp={pet.createdAt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
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
