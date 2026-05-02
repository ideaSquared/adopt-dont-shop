import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  TextInput,
  TextArea as LibTextArea,
  Alert,
  CheckboxInput,
} from '@adopt-dont-shop/lib.components';
import type { AdoptionPolicy } from '../../types/rescue';
import * as styles from './AdoptionPolicyForm.css';

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

const AdoptionPolicyForm: React.FC<AdoptionPolicyFormProps> = ({
  policy,
  onSave,
  loading = false,
}) => {
  const [formData, setFormData] = useState<AdoptionPolicy>(DEFAULT_POLICY);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    console.log('AdoptionPolicyForm received policy:', policy);
    if (policy) {
      console.log('Setting form data to:', policy);
      setFormData(policy);
    } else {
      console.log('No policy provided, using default');
      setFormData(DEFAULT_POLICY);
    }
  }, [policy]);

  const handleChange = (field: keyof AdoptionPolicy, value: any) => {
    setHasChanges(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFeeChange = (type: 'min' | 'max', value: string) => {
    setHasChanges(true);
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
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <form onSubmit={handleSubmit}>
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
                <TextInput
                  label="Minimum Number of References"
                  type="number"
                  min={0}
                  max={10}
                  value={formData.minimumReferenceCount.toString()}
                  onChange={e =>
                    handleChange('minimumReferenceCount', parseInt(e.target.value) || 0)
                  }
                  fullWidth
                />
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

        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>Adoption Fees</h3>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <TextInput
                label="Minimum Fee (£)"
                type="number"
                min={0}
                step={0.01}
                value={formData.adoptionFeeRange.min.toString()}
                onChange={e => handleFeeChange('min', e.target.value)}
                fullWidth
              />
            </div>

            <div className={styles.formGroup}>
              <TextInput
                label="Maximum Fee (£)"
                type="number"
                min={0}
                step={0.01}
                value={formData.adoptionFeeRange.max.toString()}
                onChange={e => handleFeeChange('max', e.target.value)}
                helperText="Set the range for your adoption fees"
                fullWidth
              />
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>Adoption Requirements</h3>
          <div className={styles.listInput}>
            {formData.requirements.map((req, index) => (
              <div key={index} className={styles.listItem}>
                <input
                  className={styles.listItemInput}
                  type="text"
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
              <div key={index} className={styles.listItem}>
                <input
                  className={styles.listItemInput}
                  type="text"
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
