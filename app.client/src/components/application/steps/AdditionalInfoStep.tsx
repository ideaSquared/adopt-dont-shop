import { ApplicationData } from '@/types';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as styles from './AdditionalInfoStep.css';

interface AdditionalInfoStepProps {
  data: ApplicationData['additionalInfo'];
  onComplete: (data: ApplicationData['additionalInfo']) => void;
  onChange?: (data: Partial<ApplicationData['additionalInfo']>) => void;
}

interface AdditionalInfoFormData {
  whyAdopt: string;
  expectations: string;
  emergencyPlan: string;
  agreement: boolean;
}

export const AdditionalInfoStep: React.FC<AdditionalInfoStepProps> = ({
  data,
  onComplete,
  onChange,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AdditionalInfoFormData>({
    defaultValues: {
      whyAdopt: data?.whyAdopt || '',
      expectations: data?.expectations || '',
      emergencyPlan: data?.emergencyPlan || '',
      agreement: data?.agreement || false,
    },
  });

  useEffect(() => {
    const { unsubscribe } = watch(value => {
      onChange?.(value as Partial<ApplicationData['additionalInfo']>);
    });
    return () => unsubscribe();
  }, [watch, onChange]);

  const onSubmit = (formData: AdditionalInfoFormData) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('AdditionalInfoStep onSubmit called with:', formData);
    }
    onComplete(formData as ApplicationData['additionalInfo']);
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Additional Information</h2>
      <p className={styles.stepDescription}>
        Help us understand your motivations and expectations for pet adoption.
      </p>

      <form className={styles.form} id='step-5-form' onSubmit={handleSubmit(onSubmit)}>
        <div className={styles.formGroup}>
          <label htmlFor='whyAdopt' className={styles.label}>
            Why do you want to adopt a pet? *
          </label>
          <textarea
            id='whyAdopt'
            className={styles.textArea({ hasError: !!errors.whyAdopt })}
            {...register('whyAdopt', {
              required: 'Please tell us why you want to adopt a pet',
              minLength: {
                value: 50,
                message:
                  'Please provide at least 50 characters to help us understand your motivations',
              },
            })}
            placeholder='Tell us about your motivations for adopting a pet. What are you hoping to gain from the experience?'
          />
          {errors.whyAdopt && (
            <span className={styles.errorMessage}>{errors.whyAdopt.message}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor='expectations' className={styles.label}>
            What are your expectations for pet ownership? *
          </label>
          <textarea
            id='expectations'
            className={styles.textArea({ hasError: !!errors.expectations })}
            {...register('expectations', {
              required: 'Please describe your expectations for pet ownership',
              minLength: {
                value: 50,
                message:
                  'Please provide at least 50 characters to help us understand your expectations',
              },
            })}
            placeholder='Describe what you expect from daily life with a pet. Consider time commitment, costs, behavioral aspects, etc.'
          />
          {errors.expectations && (
            <span className={styles.errorMessage}>{errors.expectations.message}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor='emergencyPlan' className={styles.label}>
            Emergency Plan *
          </label>
          <textarea
            id='emergencyPlan'
            className={styles.textArea({ hasError: !!errors.emergencyPlan })}
            {...register('emergencyPlan', {
              required: 'Please describe your emergency plan for pet care',
              minLength: {
                value: 30,
                message: 'Please provide at least 30 characters for your emergency plan',
              },
            })}
            placeholder='Describe your plan for pet care during emergencies, vacations, or unexpected situations. Include backup caregivers and emergency vet information.'
          />
          {errors.emergencyPlan && (
            <span className={styles.errorMessage}>{errors.emergencyPlan.message}</span>
          )}
        </div>

        <div className={styles.checkboxGroup}>
          <input
            id='agreement'
            type='checkbox'
            className={styles.checkboxInput({ hasError: !!errors.agreement })}
            {...register('agreement', {
              required: 'You must agree to the terms before proceeding',
            })}
          />
          <label htmlFor='agreement' className={styles.checkboxLabel}>
            I understand that adopting a pet is a long-term commitment and I agree to provide proper
            care, including regular veterinary checkups, appropriate nutrition, exercise, and a safe
            living environment. I also understand that the rescue organization may conduct follow-up
            visits to ensure the pet&apos;s welfare.
          </label>
        </div>
        {errors.agreement && (
          <span className={styles.errorMessage}>{errors.agreement.message}</span>
        )}
      </form>
    </div>
  );
};
