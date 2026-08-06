import React, { useState } from 'react';
import { FormField, Input } from '@adopt-dont-shop/lib.components';
import { CreateEventInput } from '../../types/events';
import * as styles from './EventForm.css';

interface EventFormProps {
  initialData?: Partial<CreateEventInput>;
  onSubmit: (data: CreateEventInput) => void;
  onCancel: () => void;
  isEditing?: boolean;
  // Set to true while a parent-managed mutation is in flight so the submit
  // button is disabled and double-submits are prevented (ADS-483).
  submitting?: boolean;
}

type EventErrorField = 'name' | 'description' | 'startDate' | 'endDate';
type EventErrors = Partial<Record<EventErrorField, string>>;

const validateEvent = (data: CreateEventInput): EventErrors => {
  const errors: EventErrors = {};

  if (!data.name.trim()) {
    errors.name = 'Event name is required';
  }
  if (!data.description.trim()) {
    errors.description = 'Description is required';
  }
  if (!data.startDate) {
    errors.startDate = 'Start date and time is required';
  }
  if (!data.endDate) {
    errors.endDate = 'End date and time is required';
  } else if (data.startDate && data.endDate < data.startDate) {
    errors.endDate = 'End date must be after the start date';
  }

  return errors;
};

const EventForm: React.FC<EventFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isEditing,
  submitting = false,
}) => {
  const [formData, setFormData] = useState<CreateEventInput>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    type: initialData?.type || 'adoption',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    location: initialData?.location || {
      type: 'physical',
      address: '',
      city: '',
      postcode: '',
      venue: '',
    },
    capacity: initialData?.capacity,
    registrationRequired: initialData?.registrationRequired ?? false,
    isPublic: initialData?.isPublic ?? true,
    featuredPets: initialData?.featuredPets || [],
    assignedStaff: initialData?.assignedStaff || [],
    imageUrl: initialData?.imageUrl || '',
  });
  const [errors, setErrors] = useState<EventErrors>({});

  const clearError = (field: string) => {
    if (
      field === 'name' ||
      field === 'description' ||
      field === 'startDate' ||
      field === 'endDate'
    ) {
      setErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    clearError(name);

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name.startsWith('location.')) {
      const locationField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: value,
        },
      }));
    } else if (name === 'capacity') {
      setFormData(prev => ({ ...prev, [name]: value ? parseInt(value, 10) : undefined }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLocationTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locationType = e.target.value as 'physical' | 'virtual';
    setFormData(prev => ({
      ...prev,
      location: {
        type: locationType,
        ...(locationType === 'virtual'
          ? { virtualLink: '' }
          : { address: '', city: '', postcode: '', venue: '' }),
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) {
      return;
    }

    const validationErrors = validateEvent(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    onSubmit(formData);
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.formTitle}>{isEditing ? 'Edit Event' : 'Create New Event'}</h2>

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.formGrid}>
          <FormField label="Event Name" htmlFor="name" required error={errors.name}>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              aria-required={true}
              aria-invalid={!!errors.name}
              placeholder="e.g., Spring Adoption Fair"
            />
          </FormField>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="description">
              Description *
            </label>
            <textarea
              className={styles.textArea}
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              aria-required={true}
              aria-invalid={!!errors.description}
              placeholder="Provide details about the event..."
            />
            {errors.description && (
              <span className={styles.helperText} role="alert">
                {errors.description}
              </span>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="type">
                Event Type *
              </label>
              <select
                className={styles.select}
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                aria-required={true}
              >
                <option value="adoption">Adoption Event</option>
                <option value="fundraising">Fundraising</option>
                <option value="volunteer">Volunteer Event</option>
                <option value="community">Community Outreach</option>
              </select>
            </div>

            <FormField label="Capacity (optional)" htmlFor="capacity">
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min={1}
                value={formData.capacity || ''}
                onChange={handleChange}
                placeholder="Max attendees"
              />
            </FormField>
          </div>

          <div className={styles.formRow}>
            <FormField
              label="Start Date & Time"
              htmlFor="startDate"
              required
              error={errors.startDate}
            >
              <Input
                id="startDate"
                name="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={handleChange}
                required
                aria-required={true}
                aria-invalid={!!errors.startDate}
              />
            </FormField>

            <FormField label="End Date & Time" htmlFor="endDate" required error={errors.endDate}>
              <Input
                id="endDate"
                name="endDate"
                type="datetime-local"
                value={formData.endDate}
                onChange={handleChange}
                required
                aria-required={true}
                aria-invalid={!!errors.endDate}
              />
            </FormField>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="locationType">
              Location Type *
            </label>
            <select
              className={styles.select}
              id="locationType"
              value={formData.location.type}
              onChange={handleLocationTypeChange}
            >
              <option value="physical">Physical Location</option>
              <option value="virtual">Virtual Event</option>
            </select>
          </div>

          {formData.location.type === 'physical' ? (
            <>
              <FormField label="Venue Name" htmlFor="location.venue">
                <Input
                  id="location.venue"
                  name="location.venue"
                  type="text"
                  value={formData.location.venue || ''}
                  onChange={handleChange}
                  placeholder="e.g., City Park"
                />
              </FormField>

              <FormField label="Address" htmlFor="location.address">
                <Input
                  id="location.address"
                  name="location.address"
                  type="text"
                  value={formData.location.address || ''}
                  onChange={handleChange}
                  placeholder="Street address"
                />
              </FormField>

              <div className={styles.formRow}>
                <FormField label="City" htmlFor="location.city">
                  <Input
                    id="location.city"
                    name="location.city"
                    type="text"
                    value={formData.location.city || ''}
                    onChange={handleChange}
                    placeholder="City"
                  />
                </FormField>

                <FormField label="Postcode" htmlFor="location.postcode">
                  <Input
                    id="location.postcode"
                    name="location.postcode"
                    type="text"
                    value={formData.location.postcode || ''}
                    onChange={handleChange}
                    placeholder="Postcode"
                  />
                </FormField>
              </div>
            </>
          ) : (
            <FormField
              label="Virtual Event Link"
              htmlFor="location.virtualLink"
              description="Provide a link to the virtual meeting platform (Zoom, Teams, etc.)"
            >
              <Input
                id="location.virtualLink"
                name="location.virtualLink"
                type="url"
                value={formData.location.virtualLink || ''}
                onChange={handleChange}
                placeholder="https://zoom.us/j/..."
              />
            </FormField>
          )}

          <FormField label="Event Image URL (optional)" htmlFor="imageUrl">
            <Input
              id="imageUrl"
              name="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://example.com/event-image.jpg"
            />
          </FormField>

          <div className={styles.formGroup}>
            <div className={styles.checkboxGroup}>
              <input
                className={styles.checkbox}
                id="registrationRequired"
                name="registrationRequired"
                type="checkbox"
                checked={formData.registrationRequired}
                onChange={handleChange}
              />
              <label className={styles.label} htmlFor="registrationRequired">
                Registration Required
              </label>
            </div>
            <span className={styles.helperText}>Attendees must register in advance</span>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.checkboxGroup}>
              <input
                className={styles.checkbox}
                id="isPublic"
                name="isPublic"
                type="checkbox"
                checked={formData.isPublic}
                onChange={handleChange}
              />
              <label className={styles.label} htmlFor="isPublic">
                Public Event
              </label>
            </div>
            <span className={styles.helperText}>
              Event is visible to the public on your rescue page
            </span>
          </div>
        </div>

        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.button({ variant: 'secondary' })}
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.button({ variant: 'primary' })}
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventForm;
