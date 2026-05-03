import React, { useState } from 'react';
import { Card, Button } from '@adopt-dont-shop/lib.components';
import { Pet, PetStatus } from '@adopt-dont-shop/lib.pets';
import { formatRelativeDate } from '@adopt-dont-shop/lib.utils';
import * as styles from './PetCard.css';

const getStatusLabel = (status: string) => {
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
      return status;
  }
};

const getStatusVariant = (
  status: string
): 'available' | 'pending' | 'adopted' | 'on_hold' | 'medical_care' | 'foster' | 'default' => {
  const validStatuses = [
    'available',
    'pending',
    'adopted',
    'on_hold',
    'medical_care',
    'foster',
  ] as const;
  return (validStatuses as readonly string[]).includes(status)
    ? (status as 'available' | 'pending' | 'adopted' | 'on_hold' | 'medical_care' | 'foster')
    : 'default';
};

const formatAge = (ageYears: number, ageMonths: number) => {
  if (ageYears === 0) {
    return ageMonths === 1 ? '1 month' : `${ageMonths} months`;
  }
  if (ageMonths === 0) {
    return ageYears === 1 ? '1 year' : `${ageYears} years`;
  }
  return `${ageYears}y ${ageMonths}m`;
};

interface PetCardProps {
  pet: Pet;
  onStatusChange: (petId: string, status: PetStatus, notes?: string) => void;
  onEdit: (pet: Pet) => void;
  onDelete: (petId: string, reason?: string) => Promise<void>;
}

const PetCard: React.FC<PetCardProps> = ({ pet, onStatusChange, onEdit, onDelete }) => {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newStatus, setNewStatus] = useState<PetStatus>(pet.status as PetStatus);
  const [statusNotes, setStatusNotes] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStatusUpdate = () => {
    onStatusChange(pet.pet_id, newStatus, statusNotes || undefined);
    setShowStatusModal(false);
    setStatusNotes('');
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
        <div className={styles.petImageContainer}>
          {primaryImage ? (
            <img className={styles.petImage} src={primaryImage.url} alt={pet.name} />
          ) : (
            <div className={styles.placeholderImage}>🐾</div>
          )}
          <div className={styles.statusBadgeContainer}>
            <span className={styles.statusBadge({ status: getStatusVariant(pet.status) })}>
              {getStatusLabel(pet.status)}
            </span>
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
                {formatRelativeDate(new Date(pet.created_at)).replace(' ago', '')} ago
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
            <Button variant="outline" size="sm" onClick={() => setShowStatusModal(true)}>
              Status
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              style={{ color: '#ef4444' }}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div
          className={styles.statusUpdateModal}
          onClick={() => setShowStatusModal(false)}
          onKeyDown={e => e.key === 'Escape' && setShowStatusModal(false)}
          role="presentation"
        >
          <Card
            className={styles.modalContent}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <h3>Update Pet Status</h3>

            <div className="form-group">
              <label htmlFor="status-select">New Status:</label>
              <select
                id="status-select"
                value={newStatus}
                onChange={e => setNewStatus(e.target.value as PetStatus)}
              >
                <option value="available">Available</option>
                <option value="pending">Pending</option>
                <option value="adopted">Adopted</option>
                <option value="on_hold">On Hold</option>
                <option value="medical_care">Medical Care</option>
                <option value="foster">Foster</option>
                <option value="not_available">Not Available</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="status-notes">Notes (optional):</label>
              <textarea
                id="status-notes"
                value={statusNotes}
                onChange={e => setStatusNotes(e.target.value)}
                placeholder="Add any notes about this status change..."
              />
            </div>

            <div className="modal-actions">
              <Button variant="outline" onClick={() => setShowStatusModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleStatusUpdate}>
                Update
              </Button>
            </div>
          </Card>
        </div>
      )}

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

            <p style={{ marginBottom: '1rem', color: '#666' }}>
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
                style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
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
