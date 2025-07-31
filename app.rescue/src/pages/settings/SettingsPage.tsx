import React, { useState } from 'react';
import styled from 'styled-components';
import {
  Card,
  CardHeader,
  CardContent,
  Heading,
  Text,
  Button,
  Container,
  Input,
  TextArea,
} from '@adopt-dont-shop/components';
import { usePermissions } from '@/contexts/PermissionsContext';
import { 
  FiSave, 
  FiSettings, 
  FiMail, 
  FiMapPin,
  FiClock,
  FiUsers,
  FiFileText 
} from 'react-icons/fi';

// Styled Components
const SettingsContainer = styled(Container)`
  max-width: 1200px;
  padding: 2rem 1rem;
`;

const HeaderSection = styled.div`
  margin-bottom: 2rem;
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  margin-bottom: 2rem;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const FullWidthCard = styled(Card)`
  grid-column: 1 / -1;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ActionButton = styled(Button)`
  margin-right: 1rem;
`;

const SectionIcon = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

interface RescueSettings {
  // Basic Information
  rescue_name: string;
  rescue_type: string;
  description: string;
  
  // Contact Information
  email: string;
  phone: string;
  website: string;
  
  // Address
  address_line_1: string;
  address_line_2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  
  // Operating Hours
  operating_hours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
  
  // Application Settings
  adoption_fee_required: boolean;
  home_visit_required: boolean;
  reference_check_required: boolean;
  application_auto_approval: boolean;
  
  // Notification Settings
  email_notifications: boolean;
  sms_notifications: boolean;
  application_notifications: boolean;
  adoption_notifications: boolean;
}

const defaultSettings: RescueSettings = {
  rescue_name: 'Happy Tails Rescue',
  rescue_type: 'Dog Rescue',
  description: 'We are dedicated to rescuing and rehoming dogs in need of loving families.',
  email: 'contact@happytails.org',
  phone: '+1 (555) 123-4567',
  website: 'https://happytails.org',
  address_line_1: '123 Rescue Lane',
  address_line_2: '',
  city: 'Pet City',
  county: 'Animal County',
  postcode: '12345',
  country: 'United States',
  operating_hours: {
    monday: { open: '09:00', close: '17:00', closed: false },
    tuesday: { open: '09:00', close: '17:00', closed: false },
    wednesday: { open: '09:00', close: '17:00', closed: false },
    thursday: { open: '09:00', close: '17:00', closed: false },
    friday: { open: '09:00', close: '17:00', closed: false },
    saturday: { open: '10:00', close: '16:00', closed: false },
    sunday: { open: '12:00', close: '16:00', closed: false },
  },
  adoption_fee_required: true,
  home_visit_required: true,
  reference_check_required: true,
  application_auto_approval: false,
  email_notifications: true,
  sms_notifications: false,
  application_notifications: true,
  adoption_notifications: true,
};

/**
 * SettingsPage component for rescue configuration and settings
 * Provides comprehensive rescue setup and customization options
 */
export const SettingsPage: React.FC = () => {
  const { hasPermission } = usePermissions();
  const [settings, setSettings] = useState<RescueSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);

  const handleInputChange = (field: keyof RescueSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOperatingHoursChange = (day: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [day]: {
          ...prev.operating_hours[day as keyof typeof prev.operating_hours],
          [field]: value
        }
      }
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // TODO: Implement API call to save settings
      console.log('Saving settings:', settings);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const canManageSettings = hasPermission('rescues.update' as const);

  if (!canManageSettings) {
    return (
      <SettingsContainer>
        <Card>
          <CardContent style={{ textAlign: 'center', padding: '3rem' }}>
            <Heading level="h3">Access Denied</Heading>
            <Text color="muted">
              You don't have permission to view or modify rescue settings.
            </Text>
          </CardContent>
        </Card>
      </SettingsContainer>
    );
  }

  return (
    <SettingsContainer>
      <HeaderSection>
        <Heading level="h1">Rescue Settings</Heading>
        <Text color="muted">Configure your rescue organization details and preferences</Text>
      </HeaderSection>

      <SettingsGrid>
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <SectionIcon>
              <FiSettings />
              <Heading level="h3">Basic Information</Heading>
            </SectionIcon>
          </CardHeader>
          <CardContent>
            <FormGroup>
              <Label htmlFor="rescue_name">Rescue Name *</Label>
              <Input
                id="rescue_name"
                value={settings.rescue_name}
                onChange={(e) => handleInputChange('rescue_name', e.target.value)}
                placeholder="Enter rescue name"
                disabled={!canManageSettings}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="rescue_type">Rescue Type</Label>
              <select
                id="rescue_type"
                value={settings.rescue_type}
                onChange={(e) => handleInputChange('rescue_type', e.target.value)}
                disabled={!canManageSettings}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}
              >
                <option value="Dog Rescue">Dog Rescue</option>
                <option value="Cat Rescue">Cat Rescue</option>
                <option value="Multi-Animal Rescue">Multi-Animal Rescue</option>
                <option value="Wildlife Rescue">Wildlife Rescue</option>
                <option value="Farm Animal Rescue">Farm Animal Rescue</option>
              </select>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="description">Description</Label>
              <TextArea
                id="description"
                value={settings.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                placeholder="Describe your rescue organization"
                rows={4}
                disabled={!canManageSettings}
              />
            </FormGroup>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <SectionIcon>
              <FiMail />
              <Heading level="h3">Contact Information</Heading>
            </SectionIcon>
          </CardHeader>
          <CardContent>
            <FormGroup>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contact@rescue.org"
                disabled={!canManageSettings}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={settings.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                disabled={!canManageSettings}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={settings.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://yourrescue.org"
                disabled={!canManageSettings}
              />
            </FormGroup>
          </CardContent>
        </Card>

        {/* Address Information */}
        <FullWidthCard>
          <CardHeader>
            <SectionIcon>
              <FiMapPin />
              <Heading level="h3">Address Information</Heading>
            </SectionIcon>
          </CardHeader>
          <CardContent>
            <FormGroup>
              <Label htmlFor="address_line_1">Address Line 1 *</Label>
              <Input
                id="address_line_1"
                value={settings.address_line_1}
                onChange={(e) => handleInputChange('address_line_1', e.target.value)}
                placeholder="123 Main Street"
                disabled={!canManageSettings}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="address_line_2">Address Line 2</Label>
              <Input
                id="address_line_2"
                value={settings.address_line_2}
                onChange={(e) => handleInputChange('address_line_2', e.target.value)}
                placeholder="Suite 100"
                disabled={!canManageSettings}
              />
            </FormGroup>

            <FormRow>
              <FormGroup>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={settings.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="City"
                  disabled={!canManageSettings}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="county">County/State</Label>
                <Input
                  id="county"
                  value={settings.county}
                  onChange={(e) => handleInputChange('county', e.target.value)}
                  placeholder="County or State"
                  disabled={!canManageSettings}
                />
              </FormGroup>
            </FormRow>

            <FormRow>
              <FormGroup>
                <Label htmlFor="postcode">Postal Code</Label>
                <Input
                  id="postcode"
                  value={settings.postcode}
                  onChange={(e) => handleInputChange('postcode', e.target.value)}
                  placeholder="12345"
                  disabled={!canManageSettings}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={settings.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  placeholder="Country"
                  disabled={!canManageSettings}
                />
              </FormGroup>
            </FormRow>
          </CardContent>
        </FullWidthCard>

        {/* Operating Hours */}
        <FullWidthCard>
          <CardHeader>
            <SectionIcon>
              <FiClock />
              <Heading level="h3">Operating Hours</Heading>
            </SectionIcon>
          </CardHeader>
          <CardContent>
            {Object.entries(settings.operating_hours).map(([day, hours]) => (
              <FormRow key={day} style={{ alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ textTransform: 'capitalize', fontWeight: '500' }}>
                  {day}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={!hours.closed}
                    onChange={(e) => handleOperatingHoursChange(day, 'closed', !e.target.checked)}
                    disabled={!canManageSettings}
                  />
                  <label style={{ margin: 0 }}>Open</label>
                  {!hours.closed && (
                    <>
                      <input
                        type="time"
                        value={hours.open}
                        onChange={(e) => handleOperatingHoursChange(day, 'open', e.target.value)}
                        disabled={!canManageSettings}
                        style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #ddd' }}
                      />
                      <span>to</span>
                      <input
                        type="time"
                        value={hours.close}
                        onChange={(e) => handleOperatingHoursChange(day, 'close', e.target.value)}
                        disabled={!canManageSettings}
                        style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #ddd' }}
                      />
                    </>
                  )}
                  {hours.closed && <span style={{ color: '#666' }}>Closed</span>}
                </div>
              </FormRow>
            ))}
          </CardContent>
        </FullWidthCard>

        {/* Application Settings */}
        <Card>
          <CardHeader>
            <SectionIcon>
              <FiFileText />
              <Heading level="h3">Application Settings</Heading>
            </SectionIcon>
          </CardHeader>
          <CardContent>
            <FormGroup>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={settings.adoption_fee_required}
                  onChange={(e) => handleInputChange('adoption_fee_required', e.target.checked)}
                  disabled={!canManageSettings}
                />
                Require adoption fee
              </label>
            </FormGroup>

            <FormGroup>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={settings.home_visit_required}
                  onChange={(e) => handleInputChange('home_visit_required', e.target.checked)}
                  disabled={!canManageSettings}
                />
                Require home visit
              </label>
            </FormGroup>

            <FormGroup>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={settings.reference_check_required}
                  onChange={(e) => handleInputChange('reference_check_required', e.target.checked)}
                  disabled={!canManageSettings}
                />
                Require reference check
              </label>
            </FormGroup>

            <FormGroup>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={settings.application_auto_approval}
                  onChange={(e) => handleInputChange('application_auto_approval', e.target.checked)}
                  disabled={!canManageSettings}
                />
                Enable auto-approval (when all requirements met)
              </label>
            </FormGroup>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <SectionIcon>
              <FiUsers />
              <Heading level="h3">Notification Settings</Heading>
            </SectionIcon>
          </CardHeader>
          <CardContent>
            <FormGroup>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={settings.email_notifications}
                  onChange={(e) => handleInputChange('email_notifications', e.target.checked)}
                  disabled={!canManageSettings}
                />
                Enable email notifications
              </label>
            </FormGroup>

            <FormGroup>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={settings.sms_notifications}
                  onChange={(e) => handleInputChange('sms_notifications', e.target.checked)}
                  disabled={!canManageSettings}
                />
                Enable SMS notifications
              </label>
            </FormGroup>

            <FormGroup>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={settings.application_notifications}
                  onChange={(e) => handleInputChange('application_notifications', e.target.checked)}
                  disabled={!canManageSettings}
                />
                Notify on new applications
              </label>
            </FormGroup>

            <FormGroup>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={settings.adoption_notifications}
                  onChange={(e) => handleInputChange('adoption_notifications', e.target.checked)}
                  disabled={!canManageSettings}
                />
                Notify on successful adoptions
              </label>
            </FormGroup>
          </CardContent>
        </Card>
      </SettingsGrid>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '2rem' }}>
        <ActionButton
          onClick={handleSaveSettings}
          disabled={saving || !canManageSettings}
        >
          {saving ? (
            <>
              Saving...
            </>
          ) : (
            <>
              <FiSave />
              Save Settings
            </>
          )}
        </ActionButton>
      </div>
    </SettingsContainer>
  );
};
