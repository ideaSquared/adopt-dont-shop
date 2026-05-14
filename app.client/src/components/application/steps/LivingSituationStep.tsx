import { ApplicationData } from '@/types';
import { Input } from '@adopt-dont-shop/lib.components';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as styles from './LivingSituationStep.css';

interface LivingSituationStepProps {
  data: Partial<ApplicationData['livingConditions']>;
  onComplete: (data: ApplicationData['livingConditions']) => void;
  onChange?: (data: Partial<ApplicationData['livingConditions']>) => void;
}

interface LivingSituationFormData {
  housingType: 'house' | 'apartment' | 'condo' | 'other';
  isOwned: boolean;
  hasYard: boolean;
  yardSize?: 'small' | 'medium' | 'large';
  yardFenced?: boolean;
  allowsPets: boolean;
  landlordContact?: string;
  householdSize: number;
  householdMembers?: Array<{
    name: string;
    age: number;
    relationship: string;
  }>;
  hasAllergies: boolean;
  allergyDetails?: string;
}

export const LivingSituationStep: React.FC<LivingSituationStepProps> = ({
  data,
  onComplete,
  onChange,
}) => {
  const { register, handleSubmit, watch } = useForm<LivingSituationFormData>({
    defaultValues: {
      housingType: (data.housingType as 'house' | 'apartment' | 'condo' | 'other') || 'house',
      isOwned: data.isOwned || false,
      hasYard: data.hasYard || false,
      yardSize: data.yardSize,
      yardFenced: data.yardFenced || false,
      allowsPets: data.allowsPets !== undefined ? data.allowsPets : true,
      landlordContact: data.landlordContact || '',
      householdSize: data.householdSize || 1,
      hasAllergies: data.hasAllergies || false,
      allergyDetails: data.allergyDetails || '',
    },
  });

  useEffect(() => {
    const { unsubscribe } = watch(value => {
      onChange?.(value as Partial<ApplicationData['livingConditions']>);
    });
    return () => unsubscribe();
  }, [watch, onChange]);

  const onSubmit = (formData: LivingSituationFormData) => {
    onComplete(formData as ApplicationData['livingConditions']);
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Living Situation</h2>
      <p className={styles.stepDescription}>
        Tell us about your living environment to help us ensure it&apos;s a good fit for the pet.
      </p>

      <form className={styles.form} id='step-2-form' onSubmit={handleSubmit(onSubmit)}>
        <div className={styles.formGroup}>
          <label htmlFor='housingType' className={styles.label}>
            Housing Type *
          </label>
          <select
            id='housingType'
            className={styles.styledSelect}
            {...register('housingType', { required: true })}
          >
            <option value=''>Select housing type</option>
            <option value='house'>House</option>
            <option value='apartment'>Apartment</option>
            <option value='condo'>Condo</option>
            <option value='other'>Other</option>
          </select>
        </div>

        <div className={styles.checkboxGroup}>
          <input id='isOwned' type='checkbox' {...register('isOwned')} />
          <label htmlFor='isOwned' className={styles.label}>
            I own my home
          </label>
        </div>

        <div className={styles.checkboxGroup}>
          <input id='hasYard' type='checkbox' {...register('hasYard')} />
          <label htmlFor='hasYard' className={styles.label}>
            I have a yard
          </label>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor='yardSize' className={styles.label}>
            Yard Size
          </label>
          <select id='yardSize' className={styles.styledSelect} {...register('yardSize')}>
            <option value=''>Select yard size</option>
            <option value='small'>Small</option>
            <option value='medium'>Medium</option>
            <option value='large'>Large</option>
          </select>
        </div>

        <div className={styles.checkboxGroup}>
          <input id='yardFenced' type='checkbox' {...register('yardFenced')} />
          <label htmlFor='yardFenced' className={styles.label}>
            My yard is fenced
          </label>
        </div>

        <div className={styles.checkboxGroup}>
          <input id='allowsPets' type='checkbox' {...register('allowsPets')} />
          <label htmlFor='allowsPets' className={styles.label}>
            Pets are allowed in my housing
          </label>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor='landlordContact' className={styles.label}>
            Landlord Contact (if renting)
          </label>
          <Input
            id='landlordContact'
            {...register('landlordContact')}
            placeholder='Landlord name and phone number'
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor='householdSize' className={styles.label}>
            Household Size *
          </label>
          <Input
            id='householdSize'
            {...register('householdSize', { required: true })}
            type='number'
            min='1'
            placeholder='Number of people in household'
          />
        </div>

        <div className={styles.checkboxGroup}>
          <input id='hasAllergies' type='checkbox' {...register('hasAllergies')} />
          <label htmlFor='hasAllergies' className={styles.label}>
            Someone in my household has pet allergies
          </label>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor='allergyDetails' className={styles.label}>
            Allergy Details
          </label>
          <Input
            id='allergyDetails'
            {...register('allergyDetails')}
            placeholder='Please describe any allergies'
          />
        </div>
      </form>
    </div>
  );
};
