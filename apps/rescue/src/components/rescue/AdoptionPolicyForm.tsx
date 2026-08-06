import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  Card,
  Input,
  FormField,
  TextArea as LibTextArea,
  Alert,
  CheckboxInput,
  FormSection,
  FormRow,
} from '@adopt-dont-shop/lib.components';
import type { AdoptionPolicy } from '../../types/rescue';
import * as styles from './AdoptionPolicyForm.css';

type PolicyErrors = {
  feeRange?: string;
};

const validatePolicy = (data: AdoptionPolicy): PolicyErrors => {
  const errors: PolicyErrors = {};
  if (data.adoptionFeeRange.max < data.adoptionFeeRange.min) {
    errors.feeRange = 'Maximum fee must be greater than or equal to the minimum fee';
  }
  return errors;
};

interface AdoptionPolicyFormProps {
  policy: AdoptionPolicy | null;
  onSave: (policy: AdoptionPolicy) => Promise<void>;
  loading?: boolean;
}

const DEFAULT_POLICY: AdoptionPolicy = {
  requireHomeVisit: true,
  requireReferences: true,
  minimumReferenceCount: 2,
  requireVeterinarianReference: true,
  adoptionFeeRange: { min: 0, max: 500 },
  requirements: [],
  policies: [],
};

let _idCounter = 0;
const nextId = () => `list-item-${++_idCounter}`;

const AdoptionPolicyForm: React.FC<AdoptionPolicyFormProps> = ({
  policy,
  onSave,
  loading = false,
}) => {
  const [formData, setFormData] = useState<AdoptionPolicy>(DEFAULT_POLICY);
  const [errors, setErrors] = useState<PolicyErrors>({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const requirementIds = useRef<string[]>([]);
  const policyIds = useRef<string[]>([]);

  useEffect(() => {
    const source = policy ?? DEFAULT_POLICY;
    requirementIds.current = source.requirements.map(
      (_, i) => requirementIds.current[i] ?? nextId()
    );
    policyIds.current = source.policies.map((_, i) => policyIds.current[i] ?? nextId());
    setFormData(source);
  }, [policy]);

  const handleChange = (field: keyof AdoptionPolicy, value: unknown) => {
    setHasChanges(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setFormData(prev => ({ ...prev, [field]: value }) as AdoptionPolicy);
  };

  const handleFeeChange = (type: 'min' | 'max', value: string) => {
    setHasChanges(true);
    if (errors.feeRange) {
      setErrors({});
    }
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      adoptionFeeRange: {
        ...prev.adoptionFeeRange,
        [type]: numValue,
      },
    }));
  };

  const addListItem = (field: 'requirements' | 'policies') => {
    setHasChanges(true);
    const ids = field === 'requirements' ? requirementIds : policyIds;
    ids.current = [...ids.current, nextId()];
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  const updateListItem = (field: 'requirements' | 'policies', index: number, value: string) => {
    setHasChanges(true);
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const removeListItem = (field: 'requirements' | 'policies', index: number) => {
    setHasChanges(true);
    const ids = field === 'requirements' ? requirementIds : policyIds;
    ids.current = ids.current.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validatePolicy(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      // Filter out empty strings from lists
      const cleanedData = {
        ...formData,
        requirements: formData.requirements.filter(r => r.trim()),
        policies: formData.policies.filter(p => p.trim()),
      };

      await onSave(cleanedData);
      setSuccessMessage('Adoption policies updated successfully!');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving adoption policies:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to save adoption policies. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (policy) {
      setFormData(policy);
      setHasChanges(false);
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  };

  return (
    <Card className={styles.formContainer}>
      <form onSubmit={handleSubmit} noValidate>
        {successMessage && <Alert variant="success">{successMessage}</Alert>}
        {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>Application Requirements</h3>

          <div className={styles.checkboxWrapper}>
            <CheckboxInput
              label="Require home visit for all adoptions"
              checked={formData.requireHomeVisit}
              onChange={e => handleChange('requireHomeVisit', e.target.checked)}
            />
          </div>

          <div className={styles.checkboxWrapper}>
            <CheckboxInput
              label="Require personal references"
              checked={formData.requireReferences}
              onChange={e => handleChange('requireReferences', e.target.checked)}
            />
          </div>

          {formData.requireReferences && (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <FormField label="Minimum Number of References" htmlFor="policy-min-references">
                  <Input
                    id="policy-min-references"
                    type="number"
                    min={0}
                    max={10}
                    value={formData.minimumReferenceCount.toString()}
                    onChange={e =>
                      handleChange('minimumReferenceCount', parseInt(e.target.value) || 0)
                    }
                  />
                </FormField>
              </div>

              <div className={styles.formGroup}>
                <div className={styles.checkboxWrapper}>
                  <CheckboxInput
                    label="Require veterinarian reference"
                    checked={formData.requireVeterinarianReference}
                    onChange={e => handleChange('requireVeterinarianReference', e.target.checked)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <FormSection title="Adoption Fees">
          <FormRow columns="two">
            <FormField label="Minimum Fee (£)" htmlFor="policy-fee-min">
              <Input
                id="policy-fee-min"
                type="number"
                min={0}
                step={0.01}
                value={formData.adoptionFeeRange.min.toString()}
                onChange={e => handleFeeChange('min', e.target.value)}
              />
            </FormField>
            <FormField
              label="Maximum Fee (£)"
              htmlFor="policy-fee-max"
              error={errors.feeRange}
              description="Set the range for your adoption fees"
            >
              <Input
                id="policy-fee-max"
                type="number"
                min={0}
                step={0.01}
                value={formData.adoptionFeeRange.max.toString()}
                onChange={e => handleFeeChange('max', e.target.value)}
                aria-invalid={!!errors.feeRange}
              />
            </FormField>
          </FormRow>
        </FormSection>

        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>Adoption Requirements</h3>
          <div className={styles.listInput}>
            {formData.requirements.map((req, index) => (
              <div key={requirementIds.current[index]} className={styles.listItem}>
                <Input
                  className={styles.listItemInput}
                  aria-label={`Requirement ${index + 1}`}
                  value={req}
                  onChange={e => updateListItem('requirements', index, e.target.value)}
                  placeholder="e.g., Must be 21 years or older"
                />
                <button
                  className={styles.removeButton}
                  type="button"
                  onClick={() => removeListItem('requirements', index)}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              className={styles.addButton}
              type="button"
              onClick={() => addListItem('requirements')}
            >
              + Add Requirement
            </button>
          </div>
        </div>

        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>Policies</h3>
          <div className={styles.listInput}>
            {formData.policies.map((p, index) => (
              <div key={policyIds.current[index]} className={styles.listItem}>
                <Input
                  className={styles.listItemInput}
                  aria-label={`Policy ${index + 1}`}
                  value={p}
                  onChange={e => updateListItem('policies', index, e.target.value)}
                  placeholder="e.g., All pets must be spayed/neutered"
                />
                <button
                  className={styles.removeButton}
                  type="button"
                  onClick={() => removeListItem('policies', index)}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              className={styles.addButton}
              type="button"
              onClick={() => addListItem('policies')}
            >
              + Add Policy
            </button>
          </div>
        </div>

        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>Additional Policies</h3>
          <div className={styles.formGroup}>
            <LibTextArea
              label="Return Policy"
              value={formData.returnPolicy || ''}
              onChange={e => handleChange('returnPolicy', e.target.value)}
              placeholder="Describe your policy for returning adopted pets..."
              fullWidth
            />
          </div>

          <div className={styles.formGroup}>
            <LibTextArea
              label="Spay/Neuter Policy"
              value={formData.spayNeuterPolicy || ''}
              onChange={e => handleChange('spayNeuterPolicy', e.target.value)}
              placeholder="Describe your spay/neuter requirements..."
              fullWidth
            />
          </div>

          <div className={styles.formGroup}>
            <LibTextArea
              label="Follow-up Policy"
              value={formData.followUpPolicy || ''}
              onChange={e => handleChange('followUpPolicy', e.target.value)}
              placeholder="Describe your follow-up procedures after adoption..."
              fullWidth
            />
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || saving || loading}
          >
            Reset
          </Button>
          <Button type="submit" variant="primary" disabled={!hasChanges || saving || loading}>
            {saving ? 'Saving...' : 'Save Policies'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default AdoptionPolicyForm;
