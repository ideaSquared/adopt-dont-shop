import React, { useState } from 'react';
import { Modal, Button, Input } from '@adopt-dont-shop/lib.components';
import type { AdminCreateRole, CreateUserRequest } from '@/services/userManagementService';
import * as styles from './EditUserModal.css';

type AddUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: CreateUserRequest) => Promise<void>;
};

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
        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor='add-first-name'>
              First Name
            </label>
            <Input
              id='add-first-name'
              type='text'
              value={formData.first_name}
              onChange={e => setFormData({ ...formData, first_name: e.target.value })}
              required
              aria-required={true}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor='add-last-name'>
              Last Name
            </label>
            <Input
              id='add-last-name'
              type='text'
              value={formData.last_name}
              onChange={e => setFormData({ ...formData, last_name: e.target.value })}
              required
              aria-required={true}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor='add-email'>
            Email
          </label>
          <Input
            id='add-email'
            type='email'
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            required
            aria-required={true}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor='add-role'>
              Role
            </label>
            <select
              className={styles.select}
              id='add-role'
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value as AdminCreateRole })}
            >
              {ROLE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              <input
                type='checkbox'
                checked={formData.send_invitation ?? true}
                onChange={e => setFormData({ ...formData, send_invitation: e.target.checked })}
              />{' '}
              Send invitation email
            </label>
          </div>
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

export default AddUserModal;
