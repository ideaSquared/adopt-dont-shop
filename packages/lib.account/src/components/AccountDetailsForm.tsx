import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { Alert, Button, FormField, Input } from '@adopt-dont-shop/lib.components';
import { validatePhoneNumber } from '@adopt-dont-shop/lib.utils';
import { z } from 'zod';
import * as styles from './account-forms.css';

const DetailsSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name.').max(100),
  lastName: z.string().trim().min(1, 'Enter your last name.').max(100),
  phoneNumber: z
    .string()
    .trim()
    .max(32)
    .refine(
      value => value === '' || validatePhoneNumber(value),
      'Enter a valid UK phone number, like 07700 900123.'
    ),
});

type Details = z.infer<typeof DetailsSchema>;
type DetailsErrors = Partial<Record<keyof Details, string>>;

const toErrors = (error: z.ZodError<Details>): DetailsErrors =>
  Object.fromEntries(
    Object.entries(z.flattenError(error).fieldErrors).map(([field, messages]) => [
      field,
      messages?.[0],
    ])
  );

/** Name and phone number for the signed-in user. Email is shown read-only. */
export const AccountDetailsForm = () => {
  const { user, updateProfile } = useAuth();
  const [values, setValues] = useState<Details>({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phoneNumber: user?.phoneNumber ?? '',
  });
  const [errors, setErrors] = useState<DetailsErrors>({});
  const save = useMutation({ mutationFn: (details: Details) => updateProfile(details) });

  if (!user) {
    return null;
  }

  const change = (field: keyof Details) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues(prev => ({ ...prev, [field]: event.target.value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
    if (!save.isPending) {
      save.reset();
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = DetailsSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toErrors(parsed.error));
      return;
    }
    save.mutate(parsed.data);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.twoColumns}>
        <FormField
          label='First name'
          htmlFor='account-first-name'
          required
          error={errors.firstName}
        >
          <Input
            id='account-first-name'
            autoComplete='given-name'
            value={values.firstName}
            onChange={change('firstName')}
          />
        </FormField>
        <FormField label='Last name' htmlFor='account-last-name' required error={errors.lastName}>
          <Input
            id='account-last-name'
            autoComplete='family-name'
            value={values.lastName}
            onChange={change('lastName')}
          />
        </FormField>
      </div>
      <FormField label='Phone number' htmlFor='account-phone' error={errors.phoneNumber}>
        <Input
          id='account-phone'
          type='tel'
          autoComplete='tel'
          value={values.phoneNumber}
          onChange={change('phoneNumber')}
        />
      </FormField>
      <div>
        <p className={styles.hint}>Email</p>
        <p className={styles.readOnlyValue}>{user.email}</p>
      </div>

      <div className={styles.actions}>
        <Button type='submit' isLoading={save.isPending} disabled={save.isPending}>
          Save details
        </Button>
        {save.isSuccess && (
          <p className={styles.statusMessage} role='status'>
            Details saved.
          </p>
        )}
      </div>
      {save.isError && (
        <Alert variant='error'>We could not save your details. Please try again.</Alert>
      )}
    </form>
  );
};
