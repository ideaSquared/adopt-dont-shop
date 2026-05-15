import { Pet } from '@/services';
import React from 'react';
import { resolveFileUrl } from '../../utils/fileUtils';
import * as styles from './PetSummary.css';

interface PetSummaryProps {
  pet: Pet;
}

export const PetSummary: React.FC<PetSummaryProps> = ({ pet }) => {
  const primaryImageUrl = resolveFileUrl(pet.images?.[0]?.url);
  // Pet schema fields are optional because different API responses return
  // different subsets (lib.pets/src/schemas.ts:55-57). Coerce age fields
  // to 0 before formatting so the summary degrades to "0 months" rather
  // than crashing.
  const years = pet.age_years ?? 0;
  const months = pet.age_months ?? 0;
  const ageDisplay =
    years > 0
      ? `${years} year${years > 1 ? 's' : ''}${months > 0 ? `, ${months} month${months > 1 ? 's' : ''}` : ''}`
      : `${months} month${months > 1 ? 's' : ''}`;

  return (
    <div className={styles.summaryCard}>
      {primaryImageUrl && (
        <img className={styles.petImage} src={primaryImageUrl} alt={pet.name} loading='lazy' />
      )}

      <h3 className={styles.petName}>{pet.name}</h3>

      <div className={styles.petDetails}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Type</span>
          <span className={styles.detailValue}>{pet.type}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Breed</span>
          <span className={styles.detailValue}>{pet.breed}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Age</span>
          <span className={styles.detailValue}>{ageDisplay}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Gender</span>
          <span className={styles.detailValue}>{pet.gender}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Size</span>
          <span className={styles.detailValue}>{pet.size}</span>
        </div>
        {pet.weight_kg && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Weight</span>
            <span className={styles.detailValue}>{pet.weight_kg} kg</span>
          </div>
        )}
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Status</span>
          <span className={styles.detailValue}>{pet.status}</span>
        </div>
      </div>

      {pet.adoption_fee && (
        <div className={styles.adoptionFee}>
          <div className={styles.feeLabel}>Adoption Fee</div>
          <div className={styles.feeAmount}>${pet.adoption_fee}</div>
        </div>
      )}

      <div className={styles.rescueInfo}>
        <h4 className={styles.rescueName}>{pet.rescue?.name || 'Rescue Organization'}</h4>
        {pet.rescue?.location && <p className={styles.rescueLocation}>{pet.rescue.location}</p>}
      </div>
    </div>
  );
};
