import React, { useState } from 'react';
import { CreateEventInput } from '../../types/events';
import * as styles from './EventForm.css';

interface EventFormProps {
  initialData?: Partial<CreateEventInput>;
  onSubmit: (data: CreateEventInput) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const EventForm: React.FC<EventFormProps> = ({ initialData, onSubmit, onCancel, isEditing }) => {
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

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
    onSubmit(formData);
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.formTitle}>{isEditing ? 'Edit Event' : 'Create New Event'}</h2>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="name">
              Event Name *
            </label>
            <input
              className={styles.input}
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Spring Adoption Fair"
            />
          </div>

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
              placeholder="Provide details about the event..."
            />
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
              >
                <option value="adoption">Adoption Event</option>
                <option value="fundraising">Fundraising</option>
                <option value="volunteer">Volunteer Event</option>
                <option value="community">Community Outreach</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="capacity">
                Capacity (optional)
              </label>
              <input
                className={styles.input}
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                value={formData.capacity || ''}
                onChange={handleChange}
                placeholder="Max attendees"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="startDate">
                Start Date & Time *
              </label>
              <input
                className={styles.input}
                id="startDate"
                name="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="endDate">
                End Date & Time *
              </label>
              <input
                className={styles.input}
                id="endDate"
                name="endDate"
                type="datetime-local"
                value={formData.endDate}
                onChange={handleChange}
                required
              />
            </div>
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
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="location.venue">
                  Venue Name
                </label>
                <input
                  className={styles.input}
                  id="location.venue"
                  name="location.venue"
                  type="text"
                  value={formData.location.venue || ''}
                  onChange={handleChange}
                  placeholder="e.g., City Park"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="location.address">
                  Address
                </label>
                <input
                  className={styles.input}
                  id="location.address"
                  name="location.address"
                  type="text"
                  value={formData.location.address || ''}
                  onChange={handleChange}
                  placeholder="Street address"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="location.city">
                    City
                  </label>
                  <input
                    className={styles.input}
                    id="location.city"
                    name="location.city"
                    type="text"
                    value={formData.location.city || ''}
                    onChange={handleChange}
                    placeholder="City"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="location.postcode">
                    Postcode
                  </label>
                  <input
                    className={styles.input}
                    id="location.postcode"
                    name="location.postcode"
                    type="text"
                    value={formData.location.postcode || ''}
                    onChange={handleChange}
                    placeholder="Postcode"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="location.virtualLink">
                Virtual Event Link
              </label>
              <input
                className={styles.input}
                id="location.virtualLink"
                name="location.virtualLink"
                type="url"
                value={formData.location.virtualLink || ''}
                onChange={handleChange}
                placeholder="https://zoom.us/j/..."
              />
              <span className={styles.helperText}>
                Provide a link to the virtual meeting platform (Zoom, Teams, etc.)
              </span>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="imageUrl">
              Event Image URL (optional)
            </label>
            <input
              className={styles.input}
              id="imageUrl"
              name="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://example.com/event-image.jpg"
            />
          </div>

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
          >
            Cancel
          </button>
          <button type="submit" className={styles.button({ variant: 'primary' })}>
            {isEditing ? 'Update Event' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventForm;
