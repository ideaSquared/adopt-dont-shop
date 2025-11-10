import React, { useState } from 'react';
import styled from 'styled-components';
import { Card, Button } from '@adopt-dont-shop/components';
import { Pet, PetStatus } from '@adopt-dont-shop/lib-pets';
import { formatRelativeDate } from '@adopt-dont-shop/lib-utils';

const StyledCard = styled(Card)`
  padding: 0;
  overflow: hidden;
  transition: all 0.2s ease;
  border: 1px solid ${props => props.theme.colors.neutral[200]};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const PetImageContainer = styled.div`
  position: relative;
  width: 100%;
  height: 200px;
  background: ${props => props.theme.colors.neutral[100]};
  overflow: hidden;
`;

const PetImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PlaceholderImage = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: ${props => props.theme.colors.neutral[400]};
  background: linear-gradient(135deg, ${props => props.theme.colors.neutral[50]}, ${props => props.theme.colors.neutral[100]});
`;

const StatusBadgeContainer = styled.div`
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
`;

const PetContent = styled.div`
  padding: 1.25rem;
`;

const PetHeader = styled.div`
  margin-bottom: 1rem;

  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: ${props => props.theme.text.primary};
    margin: 0 0 0.25rem 0;
    line-height: 1.2;
  }

  .pet-info {
    font-size: 0.875rem;
    color: ${props => props.theme.text.secondary};
    margin: 0;
  }
`;

const PetDetails = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;

  .detail-item {
    display: flex;
    justify-content: space-between;
    padding: 0.25rem 0;
    border-bottom: 1px solid ${props => props.theme.colors.neutral[100]};

    .label {
      color: ${props => props.theme.text.secondary};
      font-weight: 500;
    }

    .value {
      color: ${props => props.theme.text.primary};
    }
  }
`;

const PetDescription = styled.div`
  margin-bottom: 1rem;

  p {
    font-size: 0.875rem;
    color: ${props => props.theme.text.secondary};
    line-height: 1.4;
    margin: 0;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
`;

const PetActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;

  button {
    flex: 1;
    font-size: 0.875rem;
  }
`;

const StatusUpdateModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled(Card)`
  width: 100%;
  max-width: 400px;
  padding: 1.5rem;

  h3 {
    margin: 0 0 1rem 0;
    color: ${props => props.theme.text.primary};
  }

  .form-group {
    margin-bottom: 1rem;

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: ${props => props.theme.text.primary};
    }

    select, textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid ${props => props.theme.colors.neutral[300]};
      border-radius: 4px;
      font-size: 0.875rem;
      font-family: inherit;

      &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary[500]};
        box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
      }
    }

    textarea {
      resize: vertical;
      min-height: 80px;
    }
  }

  .modal-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 1.5rem;

    button {
      min-width: 80px;
    }
  }
`;

const StatusBadge = styled.span<{ status: string }>`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 4px;
  text-transform: capitalize;
  color: white;
  background-color: ${({ status }) => {
    switch (status) {
      case 'available':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'adopted':
        return '#3b82f6';
      case 'on_hold':
        return '#f97316';
      case 'medical_care':
        return '#ef4444';
      case 'foster':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  }};
`;

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

const PetCard: React.FC<PetCardProps> = ({
  pet,
  onStatusChange,
  onEdit,
  onDelete,
}) => {
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
      <StyledCard>
        <PetImageContainer>
          {primaryImage ? (
            <PetImage src={primaryImage.url} alt={pet.name} />
          ) : (
            <PlaceholderImage>🐾</PlaceholderImage>
          )}
          <StatusBadgeContainer>
            <StatusBadge status={pet.status}>
              {getStatusLabel(pet.status)}
            </StatusBadge>
          </StatusBadgeContainer>
        </PetImageContainer>

        <PetContent>
          <PetHeader>
            <h3>{pet.name}</h3>
            <p className="pet-info">
              {pet.breed} • {formatAge(pet.age_years, pet.age_months)} • {pet.gender}
            </p>
          </PetHeader>

          <PetDetails>
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
          </PetDetails>

          {pet.short_description && (
            <PetDescription>
              <p>{pet.short_description}</p>
            </PetDescription>
          )}

          <PetActions>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowStatusModal(true)}
            >
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
          </PetActions>
        </PetContent>
      </StyledCard>

      {/* Status Update Modal */}
      {showStatusModal && (
        <StatusUpdateModal onClick={() => setShowStatusModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <h3>Update Pet Status</h3>
            
            <div className="form-group">
              <label htmlFor="status-select">New Status:</label>
              <select
                id="status-select"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as PetStatus)}
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
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Add any notes about this status change..."
              />
            </div>

            <div className="modal-actions">
              <Button
                variant="outline"
                onClick={() => setShowStatusModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleStatusUpdate}
              >
                Update
              </Button>
            </div>
          </ModalContent>
        </StatusUpdateModal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <StatusUpdateModal onClick={cancelDelete}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <h3>Delete Pet: {pet.name}</h3>
            
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              Are you sure you want to delete this pet? This action cannot be undone.
            </p>
            
            <div className="form-group">
              <label htmlFor="delete-reason">Reason for deletion (optional):</label>
              <textarea
                id="delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g., Pet was adopted, medical issues, etc."
                rows={3}
              />
            </div>

            <div className="form-actions">
              <Button
                variant="outline"
                onClick={cancelDelete}
                disabled={isDeleting}
              >
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
          </ModalContent>
        </StatusUpdateModal>
      )}
    </>
  );
};

export default PetCard;
