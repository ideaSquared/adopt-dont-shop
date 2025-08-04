import React, { useState } from 'react';
import styled from 'styled-components';
import type { ReferenceCheck, HomeVisit, ApplicationTimeline } from '../../types/applications';

// Styled Components
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(75, 85, 99, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
`;

const Modal = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 72rem;
  width: 100%;
  margin: 1rem;
  max-height: 90vh;
  overflow: hidden;
`;

const LoadingContainer = styled.div`
  background: white;
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
`;

const Spinner = styled.div`
  display: inline-block;
  width: 2rem;
  height: 2rem;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
`;

const ErrorContainer = styled.div`
  background: white;
  border-radius: 0.5rem;
  padding: 2rem;
  max-width: 28rem;
`;

const ErrorText = styled.div`
  color: #ef4444;
  margin-bottom: 1rem;
`;

const ErrorMessage = styled.p`
  font-size: 0.875rem;
  color: #374151;
  margin-bottom: 1rem;
`;

const CloseButton = styled.button`
  padding: 0.5rem 1rem;
  background: #d1d5db;
  color: #374151;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: #9ca3af;
  }
`;

const Header = styled.div`
  background: #f9fafb;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
`;

const HeaderTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const HeaderSubtitle = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.25rem 0 0 0;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
  
  ${props => {
    switch (props.$status) {
      case 'submitted':
        return 'background: #dbeafe; color: #1e40af;';
      case 'under_review':
        return 'background: #fef3c7; color: #92400e;';
      case 'pending_references':
        return 'background: #fed7aa; color: #ea580c;';
      case 'approved':
        return 'background: #dcfce7; color: #166534;';
      case 'rejected':
        return 'background: #fecaca; color: #dc2626;';
      case 'withdrawn':
      case 'expired':
        return 'background: #f3f4f6; color: #374151;';
      default:
        return 'background: #f3f4f6; color: #374151;';
    }
  }}
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s;

  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: #3b82f6;
          color: white;
          &:hover { background: #2563eb; }
        `;
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          &:hover { background: #dc2626; }
        `;
      default:
        return `
          background: #f3f4f6;
          color: #374151;
          &:hover { background: #e5e7eb; }
        `;
    }
  }}
`;

const TabContainer = styled.div`
  border-bottom: 1px solid #e5e7eb;
  background: white;
`;

const TabList = styled.div`
  display: flex;
  padding: 0 1.5rem;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 1rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  color: ${props => props.$active ? '#3b82f6' : '#6b7280'};
  border-bottom-color: ${props => props.$active ? '#3b82f6' : 'transparent'};
  transition: all 0.2s;

  &:hover {
    color: #3b82f6;
  }
`;

const Content = styled.div`
  overflow-y: auto;
  max-height: calc(90vh - 120px);
`;

const TabPanel = styled.div<{ $active: boolean }>`
  display: ${props => props.$active ? 'block' : 'none'};
  padding: 1.5rem;
`;

const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1rem 0;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const Card = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1.5rem;
`;

const CardTitle = styled.h4`
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.75rem 0;
`;

const Field = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 0.5rem;
`;

const FieldLabel = styled.span`
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
`;

const FieldValue = styled.span`
  font-size: 0.875rem;
  color: #111827;
  text-align: right;
  max-width: 60%;
`;

const StatusUpdateContainer = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin: 1rem 0;
`;

const FormField = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: white;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

interface ApplicationReviewProps {
  application: any;
  references: ReferenceCheck[];
  homeVisits: HomeVisit[];
  timeline: ApplicationTimeline[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onStatusUpdate: (status: string, notes?: string) => void;
  onReferenceUpdate: (referenceId: string, status: string, notes?: string) => void;
  onScheduleVisit: (visitData: {
    scheduledDate: string;
    scheduledTime: string;
    assignedStaff: string;
    notes?: string;
  }) => void;
  onUpdateVisit: (visitId: string, updateData: any) => void;
  onAddTimelineEvent: (event: string, description: string, data?: any) => void;
}

const ApplicationReview: React.FC<ApplicationReviewProps> = ({
  application,
  references,
  homeVisits,
  timeline,
  loading,
  error,
  onClose,
  onStatusUpdate,
  onReferenceUpdate,
  onScheduleVisit,
  onUpdateVisit,
  onAddTimelineEvent
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'references' | 'visits' | 'timeline'>('details');
  const [statusNotes, setStatusNotes] = useState('');
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [newStatus, setNewStatus] = useState(application?.status || '');

  if (loading) {
    return (
      <Overlay onClick={onClose}>
        <LoadingContainer onClick={(e) => e.stopPropagation()}>
          <Spinner />
          <LoadingText>Loading application details...</LoadingText>
        </LoadingContainer>
      </Overlay>
    );
  }

  if (error) {
    return (
      <Overlay onClick={onClose}>
        <ErrorContainer onClick={(e) => e.stopPropagation()}>
          <ErrorText>Error loading application</ErrorText>
          <ErrorMessage>{error}</ErrorMessage>
          <CloseButton onClick={onClose}>Close</CloseButton>
        </ErrorContainer>
      </Overlay>
    );
  }

  if (!application) {
    return null;
  }

  const handleStatusUpdate = () => {
    onStatusUpdate(newStatus, statusNotes);
    setShowStatusUpdate(false);
    setStatusNotes('');
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <Header>
          <HeaderContent>
            <HeaderLeft>
              <HeaderTitle>
                Application for {application.petName || 'Unknown Pet'}
              </HeaderTitle>
              <HeaderSubtitle>
                Submitted by {application.applicantName || 
                  application.userName ||
                  `${application.data?.data?.personalInfo?.firstName || 'Unknown'} ${application.data?.data?.personalInfo?.lastName || ''}`.trim() ||
                  'Unknown Applicant'} • {
                  application.submittedDaysAgo !== undefined 
                    ? (application.submittedDaysAgo === 0 ? 'Today' : `${application.submittedDaysAgo} days ago`)
                    : application.submittedAt 
                      ? `${Math.floor((new Date().getTime() - new Date(application.submittedAt).getTime()) / (1000 * 60 * 60 * 24))} days ago`
                      : 'Recently'
                }
              </HeaderSubtitle>
            </HeaderLeft>
            <HeaderRight>
              <StatusBadge $status={application.status || 'unknown'}>
                {application.status ? application.status.replace('_', ' ') : 'Unknown Status'}
              </StatusBadge>
              <Button
                variant="primary"
                onClick={() => setShowStatusUpdate(!showStatusUpdate)}
              >
                Update Status
              </Button>
              <Button onClick={onClose}>×</Button>
            </HeaderRight>
          </HeaderContent>
        </Header>

        {/* Status Update Panel */}
        {showStatusUpdate && (
          <StatusUpdateContainer>
            <FormField>
              <Label>New Status</Label>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="pending_references">Pending References</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="withdrawn">Withdrawn</option>
              </Select>
            </FormField>
            <FormField>
              <Label>Notes (optional)</Label>
              <TextArea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Add any notes about this status change..."
              />
            </FormField>
            <ButtonGroup>
              <Button onClick={() => setShowStatusUpdate(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleStatusUpdate}>
                Update Status
              </Button>
            </ButtonGroup>
          </StatusUpdateContainer>
        )}

        {/* Tabs */}
        <TabContainer>
          <TabList>
            <Tab
              $active={activeTab === 'details'}
              onClick={() => setActiveTab('details')}
            >
              Application Details
            </Tab>
            <Tab
              $active={activeTab === 'references'}
              onClick={() => setActiveTab('references')}
            >
              References ({references.length})
            </Tab>
            <Tab
              $active={activeTab === 'visits'}
              onClick={() => setActiveTab('visits')}
            >
              Home Visits ({homeVisits.length})
            </Tab>
            <Tab
              $active={activeTab === 'timeline'}
              onClick={() => setActiveTab('timeline')}
            >
              Timeline ({timeline.length})
            </Tab>
          </TabList>
        </TabContainer>

        {/* Tab Content */}
        <Content>
          {/* Application Details Tab */}
          <TabPanel $active={activeTab === 'details'}>
            <Section>
              <SectionTitle>Personal Information</SectionTitle>
              <Grid>
                <Card>
                  <CardTitle>Contact Details</CardTitle>
                  <Field>
                    <FieldLabel>Name</FieldLabel>
                    <FieldValue>
                      {application.data?.data?.personalInfo?.firstName || 'N/A'} {application.data?.data?.personalInfo?.lastName || ''}
                    </FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Email</FieldLabel>
                    <FieldValue>{application.data?.data?.personalInfo?.email || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Phone</FieldLabel>
                    <FieldValue>{application.data?.data?.personalInfo?.phone || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Address</FieldLabel>
                    <FieldValue>
                      {application.data?.data?.personalInfo?.address || 'N/A'}<br />
                      {application.data?.data?.personalInfo?.city || 'N/A'}, {application.data?.data?.personalInfo?.state || 'N/A'} {application.data?.data?.personalInfo?.zipCode || 'N/A'}
                    </FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Date of Birth</FieldLabel>
                    <FieldValue>
                      {application.data?.data?.personalInfo?.dateOfBirth 
                        ? new Date(application.data.data.personalInfo.dateOfBirth).toLocaleDateString()
                        : 'N/A'}
                    </FieldValue>
                  </Field>
                </Card>

                <Card>
                  <CardTitle>Household</CardTitle>
                  <Field>
                    <FieldLabel>Household Size</FieldLabel>
                    <FieldValue>{application.data?.data?.livingsituation?.householdSize || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Housing Type</FieldLabel>
                    <FieldValue>{application.data?.data?.livingsituation?.housingType || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Own/Rent</FieldLabel>
                    <FieldValue>{application.data?.data?.livingsituation?.isOwned ? 'Own' : 'Rent'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Has Yard</FieldLabel>
                    <FieldValue>{application.data?.data?.livingsituation?.hasYard ? 'Yes' : 'No'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Has Allergies</FieldLabel>
                    <FieldValue>{application.data?.data?.livingsituation?.hasAllergies ? 'Yes' : 'No'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Household Members</FieldLabel>
                    <FieldValue>{application.data?.data?.answers?.household_members?.length || 0} members</FieldValue>
                  </Field>
                </Card>
              </Grid>
            </Section>

            <Section>
              <SectionTitle>Pet Preferences & Experience</SectionTitle>
              <Grid>
                <Card>
                  <CardTitle>Experience & Preferences</CardTitle>
                  <Field>
                    <FieldLabel>Experience Level</FieldLabel>
                    <FieldValue>{application.data?.data?.petExperience?.experienceLevel || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Willing to Train</FieldLabel>
                    <FieldValue>{application.data?.data?.petExperience?.willingToTrain ? 'Yes' : 'No'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Hours Alone Daily</FieldLabel>
                    <FieldValue>{application.data?.data?.petExperience?.hoursAloneDaily || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Exercise Plans</FieldLabel>
                    <FieldValue>{application.data?.data?.petExperience?.exercisePlans || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Currently Has Pets</FieldLabel>
                    <FieldValue>{application.data?.data?.petExperience?.hasPetsCurrently ? 'Yes' : 'No'}</FieldValue>
                  </Field>
                </Card>
                
                <Card>
                  <CardTitle>References</CardTitle>
                  <Field>
                    <FieldLabel>Veterinarian</FieldLabel>
                    <FieldValue>
                      {application.data?.data?.references?.veterinarian?.name || 'N/A'}
                      {application.data?.data?.references?.veterinarian?.clinicName && 
                        ` - ${application.data.data.references.veterinarian.clinicName}`}
                    </FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Vet Phone</FieldLabel>
                    <FieldValue>{application.data?.data?.references?.veterinarian?.phone || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Personal References</FieldLabel>
                    <FieldValue>{application.data?.data?.references?.personal?.length || 0} provided</FieldValue>
                  </Field>
                </Card>
              </Grid>
            </Section>

            <Section>
              <SectionTitle>Application Answers</SectionTitle>
              <Grid>
                <Card>
                  <CardTitle>Adoption Motivation</CardTitle>
                  <Field>
                    <FieldLabel>Why Adopt</FieldLabel>
                    <FieldValue style={{ maxWidth: '100%', textAlign: 'left' }}>
                      {application.data?.data?.answers?.why_adopt || 'N/A'}
                    </FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Exercise Plan</FieldLabel>
                    <FieldValue style={{ maxWidth: '100%', textAlign: 'left' }}>
                      {application.data?.data?.answers?.exercise_plan || 'N/A'}
                    </FieldValue>
                  </Field>
                </Card>

                <Card>
                  <CardTitle>Home Details</CardTitle>
                  <Field>
                    <FieldLabel>Yard Size</FieldLabel>
                    <FieldValue>{application.data?.data?.answers?.yard_size || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Yard Fenced</FieldLabel>
                    <FieldValue>{application.data?.data?.answers?.yard_fenced ? 'Yes' : 'No'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Hours Pet Alone</FieldLabel>
                    <FieldValue>{application.data?.data?.answers?.hours_alone || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Current Pets</FieldLabel>
                    <FieldValue>{application.data?.data?.answers?.current_pets?.length || 0} pets</FieldValue>
                  </Field>
                </Card>
              </Grid>
            </Section>

            {application.data?.data?.answers?.previous_pets?.length > 0 && (
              <Section>
                <SectionTitle>Previous Pet Experience</SectionTitle>
                <Grid>
                  {application.data.data.answers.previous_pets.map((pet: any, index: number) => (
                    <Card key={index}>
                      <CardTitle>Previous Pet #{index + 1}</CardTitle>
                      <Field>
                        <FieldLabel>Type</FieldLabel>
                        <FieldValue>{pet.type || 'N/A'}</FieldValue>
                      </Field>
                      <Field>
                        <FieldLabel>Breed</FieldLabel>
                        <FieldValue>{pet.breed || 'N/A'}</FieldValue>
                      </Field>
                      <Field>
                        <FieldLabel>Years Owned</FieldLabel>
                        <FieldValue>{pet.years_owned || 'N/A'}</FieldValue>
                      </Field>
                      <Field>
                        <FieldLabel>What Happened</FieldLabel>
                        <FieldValue style={{ maxWidth: '100%', textAlign: 'left' }}>
                          {pet.what_happened || 'N/A'}
                        </FieldValue>
                      </Field>
                    </Card>
                  ))}
                </Grid>
              </Section>
            )}
          </TabPanel>

          {/* References Tab */}
          <TabPanel $active={activeTab === 'references'}>
            <Section>
              <SectionTitle>Reference Checks</SectionTitle>
              <p>Reference check functionality would be implemented here.</p>
            </Section>
          </TabPanel>

          {/* Home Visits Tab */}
          <TabPanel $active={activeTab === 'visits'}>
            <Section>
              <SectionTitle>Home Visits</SectionTitle>
              <p>Home visit functionality would be implemented here.</p>
            </Section>
          </TabPanel>

          {/* Timeline Tab */}
          <TabPanel $active={activeTab === 'timeline'}>
            <Section>
              <SectionTitle>Application Timeline</SectionTitle>
              <p>Timeline functionality would be implemented here.</p>
            </Section>
          </TabPanel>
        </Content>
      </Modal>
    </Overlay>
  );
};

export default ApplicationReview;