import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, ProgressiveImage } from '@adopt-dont-shop/lib.components';
import { Pet, PetStatus } from '@adopt-dont-shop/lib.pets';
import { formatRelativeDate } from '@adopt-dont-shop/lib.utils';
import * as styles from './PetCard.css';

// Pet schema fields are optional because different API responses return
// different subsets (lib.pets/src/schemas.ts:55-57). Treat absent
// status / age / created_at as "Unknown" rather than crashing the card.
const getStatusLabel = (status: string | undefined) => {
  switch (status) {
    case 'available':
      return 'Available';
    case 'pending':
      return 'Pending';
    case 'adopted':
      return 'Adopted';
    case 'on_hold':
      return 'On Hold';
    case 'medical_care':
      return 'Medical Care';
    case 'foster':
      return 'Foster';
    default:
      return status ?? 'Unknown';
  }
};

const getStatusVariant = (
  status: string | undefined
): 'available' | 'pending' | 'adopted' | 'on_hold' | 'medical_care' | 'foster' | 'default' => {
  const validStatuses = [
    'available',
    'pending',
    'adopted',
    'on_hold',
    'medical_care',
    'foster',
  ] as const;
  if (status && (validStatuses as readonly string[]).includes(status)) {
    return status as 'available' | 'pending' | 'adopted' | 'on_hold' | 'medical_care' | 'foster';
  }
  return 'default';
};

const formatAge = (ageYears: number | undefined, ageMonths: number | undefined) => {
  const years = ageYears ?? 0;
  const months = ageMonths ?? 0;
  if (years === 0 && months === 0) {
    return 'Unknown';
  }
  if (years === 0) {
    return months === 1 ? '1 month' : `${months} months`;
  }
  if (months === 0) {
    return years === 1 ? '1 year' : `${years} years`;
  }
  return `${years}y ${months}m`;
};

interface PetCardProps {
  pet: Pet;
  onStatusChange: (petId: string, status: PetStatus, notes?: string) => void;
  onEdit: (pet: Pet) => void;
  onDelete: (petId: string, reason?: string) => Promise<void>;
  // ADS-646: bulk selection. Optional so the card stays usable in any
  // context that doesn't need multi-select.
  selected?: boolean;
  onToggleSelect?: (petId: string) => void;
}

// ADS-646: inline status edit. The four primary lifecycle statuses are
// surfaced as a quick-edit dropdown directly on the card so staff can
// switch a pet's status without opening a modal. The rarer transitional
// statuses (foster, medical_care, etc.) still live on the full Edit modal.
const INLINE_STATUS_OPTIONS: { value: PetStatus; label: string }[] = [
  { value: 'available' as PetStatus, label: 'Available' },
  { value: 'pending' as PetStatus, label: 'Pending' },
  { value: 'adopted' as PetStatus, label: 'Adopted' },
  { value: 'on_hold' as PetStatus, label: 'Hold' },
];

const PetCard: React.FC<PetCardProps> = ({
  pet,
  onStatusChange,
  onEdit,
  onDelete,
  selected = false,
  onToggleSelect,
}) => {
  'use memo';
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleInlineStatusChange = (next: PetStatus) => {
    if (next === pet.status) {
      return;
    }
    onStatusChange(pet.pet_id, next);
  };

  const handleEdit = () => {
    onEdit(pet);
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(pet.pet_id, deleteReason || undefined);
      setShowDeleteModal(false);
      setDeleteReason('');
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteReason('');
  };

  const primaryImage = pet.images?.find(img => img.is_primary) || pet.images?.[0];

  return (
    <>
      <Card className={styles.styledCard}>
        {onToggleSelect && (
          // ADS-646: bulk-select checkbox overlay. Only renders when the
          // grid is in selection mode (parent passes onToggleSelect).
          <label className={styles.selectCheckboxLabel}>
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(pet.pet_id)}
              aria-label={`Select ${pet.name} for bulk action`}
            />
          </label>
        )}
        <div className={styles.petImageContainer}>
          {primaryImage ? (
            <ProgressiveImage
              src={primaryImage.url}
              alt={pet.name}
              errorFallback={<div className={styles.placeholderImage}>🐾</div>}
            />
          ) : (
            <div className={styles.placeholderImage}>🐾</div>
          )}
          <div className={styles.statusBadgeContainer}>
            {pet.status === 'foster' ? (
              // ADS-644: link the foster badge to the foster page filtered to
              // this pet so staff can jump to the placement from the pet card.
              <Link
                to={`/foster?petId=${pet.pet_id}`}
                aria-label={`View foster placement for ${pet.name}`}
                className={styles.statusBadge({ status: 'foster' })}
              >
                {getStatusLabel(pet.status)}
              </Link>
            ) : (
              <span className={styles.statusBadge({ status: getStatusVariant(pet.status) })}>
                {getStatusLabel(pet.status)}
              </span>
            )}
          </div>
        </div>

        <div className={styles.petContent}>
          <div className={styles.petHeader}>
            <h3>{pet.name}</h3>
            <p className="pet-info">
              {pet.breed} • {formatAge(pet.age_years, pet.age_months)} • {pet.gender}
            </p>
          </div>

          <div className={styles.petDetails}>
            <div className="detail-item">
              <span className="label">Type:</span>
              <span className="value">{pet.type}</span>
            </div>
            <div className="detail-item">
              <span className="label">Size:</span>
              <span className="value">{pet.size}</span>
            </div>
            <div className="detail-item">
              <span className="label">Fee:</span>
              <span className="value">${pet.adoption_fee || '0'}</span>
            </div>
            <div className="detail-item">
              <span className="label">Added:</span>
              <span className="value">
                {pet.created_at
                  ? `${formatRelativeDate(new Date(pet.created_at)).replace(' ago', '')} ago`
                  : 'Unknown'}
              </span>
            </div>
          </div>

          {pet.short_description && (
            <div className={styles.petDescription}>
              <p>{pet.short_description}</p>
            </div>
          )}

          <div className={styles.petActions}>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              Edit
            </Button>
            <label className={styles.inlineStatusLabel} htmlFor={`inline-status-${pet.pet_id}`}>
              <span className={styles.inlineStatusSrOnly}>Status for {pet.name}</span>
              <select
                id={`inline-status-${pet.pet_id}`}
                className={styles.inlineStatusSelect}
                value={
                  INLINE_STATUS_OPTIONS.some(o => o.value === pet.status)
                    ? (pet.status as string)
                    : ''
                }
                onChange={e => handleInlineStatusChange(e.target.value as PetStatus)}
                aria-label={`Change status for ${pet.name}`}
              >
                {!INLINE_STATUS_OPTIONS.some(o => o.value === pet.status) && (
                  <option value="" disabled>
                    {getStatusLabel(pet.status)}
                  </option>
                )}
                {INLINE_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className={styles.dangerText}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className={styles.statusUpdateModal}
          onClick={cancelDelete}
          onKeyDown={e => e.key === 'Escape' && cancelDelete()}
          role="presentation"
        >
          <Card
            className={styles.modalContent}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <h3>Delete Pet: {pet.name}</h3>

            <p className={styles.deleteWarning}>
              Are you sure you want to delete this pet? This action cannot be undone.
            </p>

            <div className="form-group">
              <label htmlFor="delete-reason">Reason for deletion (optional):</label>
              <textarea
                id="delete-reason"
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                placeholder="e.g., Pet was adopted, medical issues, etc."
                rows={3}
              />
            </div>

            <div className="form-actions">
              <Button variant="outline" onClick={cancelDelete} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmDelete}
                disabled={isDeleting}
                className={styles.dangerButton}
              >
                {isDeleting ? 'Deleting...' : 'Delete Pet'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default PetCard;
