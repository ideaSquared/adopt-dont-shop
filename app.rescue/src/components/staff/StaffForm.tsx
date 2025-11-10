import React, { useState } from 'react';
import styled from 'styled-components';
import { NewStaffMember, StaffMember } from '../../types/staff';

interface StaffFormProps {
  initialStaff?: StaffMember;
  onSubmit: (staffData: NewStaffMember) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
  loading?: boolean;
}

const FormOverlay = styled.div`
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
  padding: 2rem;
`;

const FormModal = styled.div`
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 2rem 1rem 2rem;
  border-bottom: 1px solid #e9ecef;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: #333;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #666;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s ease;

  &:hover {
    background: #f5f5f5;
    color: #333;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Form = styled.form`
  padding: 2rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
`;

const RequiredIndicator = styled.span`
  color: #dc3545;
`;

const FormInput = styled.input<{ hasError?: boolean }>`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid ${props => props.hasError ? '#dc3545' : '#e9ecef'};
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#dc3545' : '#1976d2'};
  }

  &:disabled {
    background-color: #f8f9fa;
    color: #6c757d;
  }
`;

const FormError = styled.span`
  display: block;
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
`;

const FormHelp = styled.small`
  display: block;
  color: #666;
  font-size: 0.875rem;
  margin-top: 0.25rem;
`;

const FormActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;

  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const ActionButton = styled.button<{ variant: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  ${props => props.variant === 'primary' && `
    background: #1976d2;
    color: white;

    &:hover:not(:disabled) {
      background: #1565c0;
    }
  `}

  ${props => props.variant === 'secondary' && `
    background: #f8f9fa;
    color: #495057;
    border: 1px solid #dee2e6;

    &:hover:not(:disabled) {
      background: #e9ecef;
      color: #212529;
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const FormInfo = styled.div`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 2rem;
  border: 1px solid #e9ecef;
`;

const InfoSection = styled.div`
  h4 {
    margin: 0 0 1rem 0;
    color: #333;
    font-weight: 600;
  }

  ol {
    margin: 0;
    padding-left: 1.25rem;
    color: #666;

    li {
      margin-bottom: 0.5rem;
    }
  }
`;

const LoadingSpinner = styled.span`
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const StaffForm: React.FC<StaffFormProps> = ({
  initialStaff,
  onSubmit,
  onCancel,
  isEditing = false,
  loading = false,
}) => {
  const [formData, setFormData] = useState<NewStaffMember>({
    userId: initialStaff?.userId || '',
    title: initialStaff?.title || '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof NewStaffMember, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.userId.trim()) {
      newErrors.userId = 'User ID is required';
    } else if (!/^user_[a-zA-Z0-9_]+$/.test(formData.userId)) {
      newErrors.userId = 'Please enter a valid user ID (format: user_*)';
    }

    if (formData.title && formData.title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  return (
    <FormOverlay>
      <FormModal>
        <ModalHeader>
          <ModalTitle>{isEditing ? 'Edit Staff Member' : 'Add New Staff Member'}</ModalTitle>
          <CloseButton 
            onClick={onCancel}
            disabled={loading}
          >
            ✕
          </CloseButton>
        </ModalHeader>

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <FormLabel htmlFor="userId">
              User ID <RequiredIndicator>*</RequiredIndicator>
            </FormLabel>
            <FormInput
              id="userId"
              type="text"
              hasError={!!errors.userId}
              value={formData.userId}
              onChange={(e) => handleInputChange('userId', e.target.value)}
              placeholder="Enter the user ID of the user to add as staff (e.g., user_rescue_staff_001)"
              disabled={isEditing || loading}
              required
            />
            {errors.userId && (
              <FormError>{errors.userId}</FormError>
            )}
            <FormHelp>
              This should be the user ID of an existing user in the system
            </FormHelp>
          </FormGroup>

          <FormGroup>
            <FormLabel htmlFor="title">
              Title
            </FormLabel>
            <FormInput
              id="title"
              type="text"
              hasError={!!errors.title}
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Volunteer, Coordinator, Manager"
              disabled={loading}
              maxLength={100}
            />
            {errors.title && (
              <FormError>{errors.title}</FormError>
            )}
          </FormGroup>

          <FormActions>
            <ActionButton
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </ActionButton>
            <ActionButton
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner />
                  {isEditing ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>
                  {isEditing ? 'Update Staff Member' : 'Add Staff Member'}
                </>
              )}
            </ActionButton>
          </FormActions>
        </Form>

        {!isEditing && (
          <FormInfo>
            <InfoSection>
              <h4>💡 How to find a User ID:</h4>
              <ol>
                <li>The user must first create an account on the platform</li>
                <li>Ask them to log in and navigate to their profile settings</li>
                <li>They can find their User ID in the profile section</li>
                <li>Copy the user ID and paste it in the field above</li>
              </ol>
            </InfoSection>
          </FormInfo>
        )}
      </FormModal>
    </FormOverlay>
  );
};

export default StaffForm;
