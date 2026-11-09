import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  NEW_PASSWORD_HINT,
  NewPasswordSchema,
  authService,
  useAuth,
} from '@adopt-dont-shop/lib.auth';
import { Alert, Button, FormField, Input, toast } from '@adopt-dont-shop/lib.components';
import { z } from 'zod';
import * as styles from './account-forms.css';

// New passwords follow the canonical strong policy, capped at the gateway's 128 characters.
const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.').max(128),
    newPassword: NewPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine(values => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

type PasswordValues = z.infer<typeof ChangePasswordSchema>;
type PasswordErrors = Partial<Record<keyof PasswordValues, string>>;

const EMPTY: PasswordValues = { currentPassword: '', newPassword: '', confirmPassword: '' };

const toErrors = (error: z.ZodError<PasswordValues>): PasswordErrors =>
  Object.fromEntries(
    Object.entries(z.flattenError(error).fieldErrors).map(([field, messages]) => [
      field,
      messages?.[0],
    ])
  );

/**
 * Changing the password ends every session, including this one (the auth
 * service bumps tokens_valid_from), so on success the user is signed out with
 * an explanation instead of hitting a "session expired" on their next click.
 */
export const ChangePasswordForm = () => {
  const { logout } = useAuth();
  const [values, setValues] = useState<PasswordValues>(EMPTY);
  const [errors, setErrors] = useState<PasswordErrors>({});
  const change = useMutation({
    mutationFn: ({ currentPassword, newPassword }: PasswordValues) =>
      authService.changePassword({ currentPassword, newPassword }),
    onSuccess: async () => {
      toast.success('Password changed. Sign in with your new password.');
      await logout();
    },
  });

  const update = (field: keyof PasswordValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues(prev => ({ ...prev, [field]: event.target.value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = ChangePasswordSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toErrors(parsed.error));
      return;
    }
    change.mutate(parsed.data);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormField
        label='Current password'
        htmlFor='current-password'
        required
        error={errors.currentPassword}
      >
        <Input
          id='current-password'
          type='password'
          autoComplete='current-password'
          value={values.currentPassword}
          onChange={update('currentPassword')}
        />
      </FormField>
      <FormField
        label='New password'
        htmlFor='new-password'
        required
        description={NEW_PASSWORD_HINT}
        error={errors.newPassword}
      >
        <Input
          id='new-password'
          type='password'
          autoComplete='new-password'
          value={values.newPassword}
          onChange={update('newPassword')}
        />
      </FormField>
      <FormField
        label='Confirm new password'
        htmlFor='confirm-password'
        required
        error={errors.confirmPassword}
      >
        <Input
          id='confirm-password'
          type='password'
          autoComplete='new-password'
          value={values.confirmPassword}
          onChange={update('confirmPassword')}
        />
      </FormField>
      <p className={styles.hint}>You will be signed out on all devices after changing it.</p>

      <div className={styles.actions}>
        <Button type='submit' isLoading={change.isPending} disabled={change.isPending}>
          Change password
        </Button>
      </div>
      {change.isError && (
        <Alert variant='error'>
          We could not change your password. Check your current password and try again.
        </Alert>
      )}
    </form>
  );
};
