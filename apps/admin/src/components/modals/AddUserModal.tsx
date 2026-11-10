import React, { useState } from 'react';
import {
  Alert,
  Button,
  CheckboxInput,
  FormField,
  Input,
  Modal,
  SelectInput,
} from '@adopt-dont-shop/lib.components';
import type { AdminCreateRole, CreateUserRequest } from '@/services/userManagementService';
import * as styles from './EditUserModal.css';

type AddUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: CreateUserRequest) => Promise<void>;
};

const toCreateRole = (value: string | string[]): AdminCreateRole =>
  ROLE_OPTIONS.find(option => option.value === value)?.value ?? 'adopter';

const ROLE_OPTIONS: Array<{ value: AdminCreateRole; label: string }> = [
  { value: 'adopter', label: 'Adopter' },
  { value: 'rescue_staff', label: 'Rescue Staff' },
  { value: 'support_agent', label: 'Support Agent' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

export const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState<CreateUserRequest>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'adopter',
    is_active: true,
    send_invitation: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      role: 'adopter',
      is_active: true,
      send_invitation: true,
    });
    setError(null);
  };

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onCreate(formData);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title='Add User'>
      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <Alert variant='error'>{error}</Alert>}

        <div className={styles.formRow}>
          <FormField label='First Name' htmlFor='add-first-name' required>
            <Input
              id='add-first-name'
              type='text'
              value={formData.first_name}
              onChange={e => setFormData({ ...formData, first_name: e.target.value })}
              required
              aria-required={true}
            />
          </FormField>

          <FormField label='Last Name' htmlFor='add-last-name' required>
            <Input
              id='add-last-name'
              type='text'
              value={formData.last_name}
              onChange={e => setFormData({ ...formData, last_name: e.target.value })}
              required
              aria-required={true}
            />
          </FormField>
        </div>

        <FormField label='Email' htmlFor='add-email' required>
          <Input
            id='add-email'
            type='email'
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            required
            aria-required={true}
          />
        </FormField>

        <div className={styles.formRow}>
          <SelectInput
            label='Role'
            data-testid='add-role'
            value={formData.role}
            onChange={value => setFormData({ ...formData, role: toCreateRole(value) })}
            options={ROLE_OPTIONS}
            fullWidth
          />

          <CheckboxInput
            id='add-send-invitation'
            label='Send invitation email'
            checked={formData.send_invitation ?? true}
            onChange={e => setFormData({ ...formData, send_invitation: e.target.checked })}
          />
        </div>

        <div className={styles.buttonGroup}>
          <Button type='button' variant='outline' onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type='submit' variant='primary' disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
