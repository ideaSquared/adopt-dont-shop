import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Modal, Button, Input } from '@adopt-dont-shop/lib.components';
import type { AdminUser, UserType, UserStatus } from '@/types';

type EditUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  onSave: (userId: string, updates: Partial<AdminUser>) => Promise<void>;
};

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
`;

const Select = styled.select`
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #111827;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #9ca3af;
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ErrorMessage = styled.div`
  padding: 0.75rem 1rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  font-size: 0.875rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
`;

export const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onSave }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    userType: 'user' as UserType,
    status: 'active' as UserStatus,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        email: user.email,
        phoneNumber: user.phoneNumber ?? '',
        userType: user.userType,
        status: user.status,
      });
      setError(null);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Only send changed fields
      const updates: Partial<AdminUser> = {};
      if (formData.firstName !== user.firstName) {
        updates.firstName = formData.firstName;
      }
      if (formData.lastName !== user.lastName) {
        updates.lastName = formData.lastName;
      }
      if (formData.email !== user.email) {
        updates.email = formData.email;
      }
      if (formData.phoneNumber !== (user.phoneNumber ?? '')) {
        updates.phoneNumber = formData.phoneNumber;
      }
      if (formData.userType !== user.userType) {
        updates.userType = formData.userType as typeof user.userType;
      }
      if (formData.status !== user.status) {
        updates.status = formData.status;
      }

      if (Object.keys(updates).length === 0) {
        onClose();
        return;
      }

      await onSave(user.userId, updates);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='Edit User'>
      <Form onSubmit={handleSubmit}>
        {error && <ErrorMessage>{error}</ErrorMessage>}

        <FormRow>
          <FormGroup>
            <Label htmlFor='first_name'>First Name</Label>
            <Input
              id='first_name'
              type='text'
              value={formData.firstName}
              onChange={e => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor='last_name'>Last Name</Label>
            <Input
              id='last_name'
              type='text'
              value={formData.lastName}
              onChange={e => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </FormGroup>
        </FormRow>

        <FormGroup>
          <Label htmlFor='email'>Email</Label>
          <Input
            id='email'
            type='email'
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor='phone_number'>Phone Number</Label>
          <Input
            id='phone_number'
            type='tel'
            value={formData.phoneNumber}
            onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
          />
        </FormGroup>

        <FormRow>
          <FormGroup>
            <Label htmlFor='role'>Role</Label>
            <Select
              id='role'
              value={formData.userType}
              onChange={e => setFormData({ ...formData, userType: e.target.value as UserType })}
            >
              <option value='user'>User</option>
              <option value='admin'>Admin</option>
              <option value='moderator'>Moderator</option>
              <option value='super_admin'>Super Admin</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor='is_active'>Status</Label>
            <Select
              id='is_active'
              value={formData.status === 'active' ? 'active' : 'suspended'}
              onChange={e => setFormData({ ...formData, status: e.target.value as UserStatus })}
            >
              <option value='active'>Active</option>
              <option value='suspended'>Suspended</option>
            </Select>
          </FormGroup>
        </FormRow>

        <ButtonGroup>
          <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type='submit' variant='primary' disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </ButtonGroup>
      </Form>
    </Modal>
  );
};
