import React, { useState } from 'react';
import styled from 'styled-components';
import { CreateEventInput } from '../../types/events';

interface EventFormProps {
  initialData?: Partial<CreateEventInput>;
  onSubmit: (data: CreateEventInput) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const FormContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
`;

const FormTitle = styled.h2`
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.text?.primary || '#111827'};
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.theme.text?.primary || '#111827'};
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.neutral?.[300] || '#d1d5db'};
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary?.[500] || '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary?.[100] || '#dbeafe'};
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.neutral?.[300] || '#d1d5db'};
  border-radius: 8px;
  font-size: 0.875rem;
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary?.[500] || '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary?.[100] || '#dbeafe'};
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.neutral?.[300] || '#d1d5db'};
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary?.[500] || '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary?.[100] || '#dbeafe'};
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Checkbox = styled.input`
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${props => props.theme.colors.neutral?.[200] || '#e5e7eb'};
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props =>
    props.$variant === 'primary'
      ? `
    background: ${props.theme.colors.primary?.[600] || '#2563eb'};
    color: white;

    &:hover {
      background: ${props.theme.colors.primary?.[700] || '#1d4ed8'};
    }
  `
      : `
    background: ${props.theme.colors.neutral?.[100] || '#f3f4f6'};
    color: ${props.theme.text?.primary || '#111827'};

    &:hover {
      background: ${props.theme.colors.neutral?.[200] || '#e5e7eb'};
    }
  `}

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary?.[100] || '#dbeafe'};
  }
`;

const HelperText = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.text?.secondary || '#6b7280'};
`;

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
    <FormContainer>
      <FormTitle>{isEditing ? 'Edit Event' : 'Create New Event'}</FormTitle>

      <form onSubmit={handleSubmit}>
        <FormGrid>
          <FormGroup>
            <Label htmlFor="name">Event Name *</Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Spring Adoption Fair"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="description">Description *</Label>
            <TextArea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              placeholder="Provide details about the event..."
            />
          </FormGroup>

          <FormRow>
            <FormGroup>
              <Label htmlFor="type">Event Type *</Label>
              <Select id="type" name="type" value={formData.type} onChange={handleChange} required>
                <option value="adoption">Adoption Event</option>
                <option value="fundraising">Fundraising</option>
                <option value="volunteer">Volunteer Event</option>
                <option value="community">Community Outreach</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="capacity">Capacity (optional)</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                value={formData.capacity || ''}
                onChange={handleChange}
                placeholder="Max attendees"
              />
            </FormGroup>
          </FormRow>

          <FormRow>
            <FormGroup>
              <Label htmlFor="startDate">Start Date & Time *</Label>
              <Input
                id="startDate"
                name="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="endDate">End Date & Time *</Label>
              <Input
                id="endDate"
                name="endDate"
                type="datetime-local"
                value={formData.endDate}
                onChange={handleChange}
                required
              />
            </FormGroup>
          </FormRow>

          <FormGroup>
            <Label htmlFor="locationType">Location Type *</Label>
            <Select
              id="locationType"
              value={formData.location.type}
              onChange={handleLocationTypeChange}
            >
              <option value="physical">Physical Location</option>
              <option value="virtual">Virtual Event</option>
            </Select>
          </FormGroup>

          {formData.location.type === 'physical' ? (
            <>
              <FormGroup>
                <Label htmlFor="location.venue">Venue Name</Label>
                <Input
                  id="location.venue"
                  name="location.venue"
                  type="text"
                  value={formData.location.venue || ''}
                  onChange={handleChange}
                  placeholder="e.g., City Park"
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="location.address">Address</Label>
                <Input
                  id="location.address"
                  name="location.address"
                  type="text"
                  value={formData.location.address || ''}
                  onChange={handleChange}
                  placeholder="Street address"
                />
              </FormGroup>

              <FormRow>
                <FormGroup>
                  <Label htmlFor="location.city">City</Label>
                  <Input
                    id="location.city"
                    name="location.city"
                    type="text"
                    value={formData.location.city || ''}
                    onChange={handleChange}
                    placeholder="City"
                  />
                </FormGroup>

                <FormGroup>
                  <Label htmlFor="location.postcode">Postcode</Label>
                  <Input
                    id="location.postcode"
                    name="location.postcode"
                    type="text"
                    value={formData.location.postcode || ''}
                    onChange={handleChange}
                    placeholder="Postcode"
                  />
                </FormGroup>
              </FormRow>
            </>
          ) : (
            <FormGroup>
              <Label htmlFor="location.virtualLink">Virtual Event Link</Label>
              <Input
                id="location.virtualLink"
                name="location.virtualLink"
                type="url"
                value={formData.location.virtualLink || ''}
                onChange={handleChange}
                placeholder="https://zoom.us/j/..."
              />
              <HelperText>
                Provide a link to the virtual meeting platform (Zoom, Teams, etc.)
              </HelperText>
            </FormGroup>
          )}

          <FormGroup>
            <Label htmlFor="imageUrl">Event Image URL (optional)</Label>
            <Input
              id="imageUrl"
              name="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://example.com/event-image.jpg"
            />
          </FormGroup>

          <FormGroup>
            <CheckboxGroup>
              <Checkbox
                id="registrationRequired"
                name="registrationRequired"
                type="checkbox"
                checked={formData.registrationRequired}
                onChange={handleChange}
              />
              <Label htmlFor="registrationRequired">Registration Required</Label>
            </CheckboxGroup>
            <HelperText>Attendees must register in advance</HelperText>
          </FormGroup>

          <FormGroup>
            <CheckboxGroup>
              <Checkbox
                id="isPublic"
                name="isPublic"
                type="checkbox"
                checked={formData.isPublic}
                onChange={handleChange}
              />
              <Label htmlFor="isPublic">Public Event</Label>
            </CheckboxGroup>
            <HelperText>Event is visible to the public on your rescue page</HelperText>
          </FormGroup>
        </FormGrid>

        <FormActions>
          <Button type="button" $variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" $variant="primary">
            {isEditing ? 'Update Event' : 'Create Event'}
          </Button>
        </FormActions>
      </form>
    </FormContainer>
  );
};

export default EventForm;
