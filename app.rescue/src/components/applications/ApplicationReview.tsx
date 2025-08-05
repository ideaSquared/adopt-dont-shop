import React, { useState, useMemo, useEffect } from 'react';
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
      case 'draft':
        return 'background: #f3f4f6; color: #374151;';
      case 'submitted':
        return 'background: #dbeafe; color: #1e40af;';
      case 'under_review':
        return 'background: #fef3c7; color: #92400e;';
      case 'pending_references':
        return 'background: #fed7aa; color: #ea580c;';
      case 'reference_check':
        return 'background: #fef3c7; color: #92400e;';
      case 'interview_scheduled':
        return 'background: #ddd6fe; color: #5b21b6;';
      case 'interview_completed':
        return 'background: #ddd6fe; color: #5b21b6;';
      case 'home_visit_scheduled':
        return 'background: #e0e7ff; color: #3730a3;';
      case 'home_visit_completed':
        return 'background: #e0e7ff; color: #3730a3;';
      case 'approved':
        return 'background: #dcfce7; color: #166534;';
      case 'conditionally_approved':
        return 'background: #fef3c7; color: #92400e;';
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

const FieldValueFullWidth = styled.div`
  font-size: 0.875rem;
  color: #111827;
  margin-top: 0.5rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
`;

const FieldVertical = styled.div`
  margin-bottom: 1rem;
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

const ReferenceCard = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1rem;
`;

const ReferenceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
`;

const ReferenceInfo = styled.div``;

const ReferenceName = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const ReferenceContact = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.25rem 0;
`;

const ReferenceRelation = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
`;

const ReferenceStatus = styled.span<{ $status: string }>`
  display: inline-flex;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
  
  ${props => {
    switch (props.$status) {
      case 'verified':
        return 'background: #dcfce7; color: #166534;';
      case 'contacted':
        return 'background: #fef3c7; color: #92400e;';
      case 'pending':
        return 'background: #f3f4f6; color: #374151;';
      case 'failed':
        return 'background: #fecaca; color: #dc2626;';
      default:
        return 'background: #f3f4f6; color: #374151;';
    }
  }}
`;

const ReferenceNotes = styled.div`
  font-size: 0.875rem;
  color: #374151;
  background: #f9fafb;
  border-radius: 0.375rem;
  padding: 0.75rem;
  margin-top: 1rem;
`;

const ReferenceActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const StatusSelect = styled.select`
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  margin-bottom: 0.5rem;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
`;

const NotesInput = styled.textarea`
  width: 100%;
  padding: 0.5rem;
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  resize: vertical;
  min-height: 80px;
  margin: 0.5rem 0;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
`;

const ReferenceForm = styled.div`
  background: #f9fafb;
  border-radius: 0.375rem;
  padding: 1rem;
  margin-top: 1rem;
  border: 1px solid #e5e7eb;
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
  onRefresh?: () => void; // Optional refresh function to update application data
}

const ApplicationReview: React.FC<ApplicationReviewProps> = ({
  application,
  homeVisits,
  timeline,
  loading,
  error,
  onClose,
  onStatusUpdate,
  onReferenceUpdate,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'references' | 'visits' | 'timeline'>('details');
  const [statusNotes, setStatusNotes] = useState('');
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [referenceUpdates, setReferenceUpdates] = useState<Record<string, { status: string; notes: string; showForm: boolean }>>({});
  
  // Local state for optimistic application status updates
  const [localApplicationStatus, setLocalApplicationStatus] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Helper function to get valid status transitions based on current status
  const getValidStatusOptions = (currentStatus: string) => {
    const validTransitions: Record<string, string[]> = {
      'draft': ['submitted', 'withdrawn'],
      'submitted': ['under_review', 'rejected', 'withdrawn'],
      'under_review': ['pending_references', 'interview_scheduled', 'approved', 'rejected', 'withdrawn'],
      'pending_references': ['reference_check', 'rejected', 'withdrawn'],
      'reference_check': ['interview_scheduled', 'approved', 'rejected', 'withdrawn'],
      'interview_scheduled': ['interview_completed', 'rejected', 'withdrawn'],
      'interview_completed': ['home_visit_scheduled', 'approved', 'conditionally_approved', 'rejected', 'withdrawn'],
      'home_visit_scheduled': ['home_visit_completed', 'rejected', 'withdrawn'],
      'home_visit_completed': ['approved', 'conditionally_approved', 'rejected', 'withdrawn'],
      'conditionally_approved': ['approved', 'rejected', 'withdrawn'],
      'approved': [],
      'rejected': [],
      'withdrawn': [],
      'expired': [],
    };

    return validTransitions[currentStatus] || [];
  };

  // Helper function to format status display names
  const formatStatusName = (status: string) => {
    const statusNames: Record<string, string> = {
      'draft': 'Draft',
      'submitted': 'Submitted',
      'under_review': 'Under Review',
      'pending_references': 'Pending References',
      'reference_check': 'Reference Check',
      'interview_scheduled': 'Interview Scheduled',
      'interview_completed': 'Interview Completed',
      'home_visit_scheduled': 'Home Visit Scheduled',
      'home_visit_completed': 'Home Visit Completed',
      'approved': 'Approved',
      'conditionally_approved': 'Conditionally Approved',
      'rejected': 'Rejected',
      'withdrawn': 'Withdrawn',
      'expired': 'Expired',
    };

    return statusNames[status] || status.replace('_', ' ');
  };

  // Clear local state when application changes
  useEffect(() => {
    setReferenceUpdates({});
    setLocalApplicationStatus(null); // Clear local status when application changes
  }, [application?.id]);
  
  // Clear local status when application status actually changes from backend
  useEffect(() => {
    if (application?.status && localApplicationStatus && application.status !== localApplicationStatus) {
      setLocalApplicationStatus(null); // Backend data has caught up, clear local override
    }
  }, [application?.status, localApplicationStatus]);

  // Get current status (prefer local state for immediate updates)
  const getCurrentStatus = () => {
    return localApplicationStatus || application?.status || 'unknown';
  };

  // Helper function to safely extract data from both legacy nested and current flat structures
  const getData = (path: string) => {
    // Try current flat structure first: application.data.personalInfo
    const flatPath = path.split('.').reduce((obj, key) => obj?.[key], application?.data);
    if (flatPath !== undefined) return flatPath;
    
    // Fallback to legacy nested structure: application.data.data.personalInfo  
    const nestedPath = path.split('.').reduce((obj, key) => obj?.[key], application?.data?.data);
    return nestedPath;
  };

  // Extract references from application data
  const extractedReferences: ReferenceCheck[] = useMemo(() => {
    const allRefs: ReferenceCheck[] = [];
    
    // First, try to get references from the main references array (backend format)
    const directReferences = application?.references || [];
    if (Array.isArray(directReferences) && directReferences.length > 0) {
      directReferences.forEach((ref: any, index: number) => {
        allRefs.push({
          id: ref.id || `ref-${index}`, // Use the reference ID if available, fallback to index-based ID
          applicationId: application.id,
          type: ref.relationship?.toLowerCase().includes('vet') ? 'veterinarian' : 'personal',
          contactName: ref.name,
          contactInfo: `${ref.phone} - ${ref.relationship}`,
          status: ref.status || 'pending',
          notes: ref.notes || '',
          completedAt: ref.contacted_at,
          completedBy: ref.contacted_by,
        });
      });
    } else {
      // Fallback: try to get references from nested client data structure
      const clientRefs = getData('references') || {};
      const personalRefs = clientRefs.personal || [];
      const vetRef = clientRefs.veterinarian;
      
      let referenceIndex = 0;
      
      // Add veterinarian reference if exists
      if (vetRef && vetRef.name && vetRef.name !== 'To be determined') {
        allRefs.push({
          id: `ref-${referenceIndex}`,
          applicationId: application.id,
          type: 'veterinarian',
          contactName: vetRef.name,
          contactInfo: `${vetRef.phone || 'No phone'} - ${vetRef.clinicName || 'Veterinarian'}`,
          status: vetRef.status || 'pending',
          notes: vetRef.notes || '',
          completedAt: vetRef.contacted_at,
          completedBy: vetRef.contacted_by,
        });
        referenceIndex++;
      }
      
      // Add personal references
      personalRefs.forEach((ref: any) => {
        if (ref.name) {
          allRefs.push({
            id: `ref-${referenceIndex}`,
            applicationId: application.id,
            type: 'personal',
            contactName: ref.name,
            contactInfo: `${ref.phone || 'No phone'} - ${ref.relationship || 'Personal Reference'}`,
            status: ref.status || 'pending',
            notes: ref.notes || '',
            completedAt: ref.contacted_at,
            completedBy: ref.contacted_by,
          });
          referenceIndex++;
        }
      });
    }
    
    console.log(`Application ${application?.id}: Found ${allRefs.length} references`, {
      directReferencesCount: directReferences.length,
      clientReferences: getData('references'),
      extractedReferences: allRefs
    });
    
    return allRefs;
  }, [application]);

  const handleReferenceUpdate = async (referenceId: string, status: string, notes: string) => {
    try {
      console.log(`Attempting to update reference ${referenceId} with status ${status}`);
      await onReferenceUpdate(referenceId, status, notes);
      
      // Hide the form after successful update
      setReferenceUpdates(prev => ({
        ...prev,
        [referenceId]: { 
          ...prev[referenceId], 
          showForm: false,
          status, // Update the local status immediately
          notes   // Update the local notes immediately
        }
      }));
      
      console.log(`Successfully updated reference ${referenceId} to status ${status}`);
    } catch (error) {
      console.error('Failed to update reference:', error);
      // Show user-friendly error message
      alert(`Failed to update reference: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const toggleReferenceForm = (referenceId: string) => {
    setReferenceUpdates(prev => ({
      ...prev,
      [referenceId]: {
        status: prev[referenceId]?.status || 'pending',
        notes: prev[referenceId]?.notes || '',
        showForm: !prev[referenceId]?.showForm
      }
    }));
  };

  const updateReferenceField = (referenceId: string, field: 'status' | 'notes', value: string) => {
    setReferenceUpdates(prev => ({
      ...prev,
      [referenceId]: {
        ...prev[referenceId],
        [field]: value
      }
    }));
  };

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

  const handleStatusUpdate = async () => {
    try {
      setIsUpdatingStatus(true);
      await onStatusUpdate(newStatus, statusNotes);
      
      // Update local status immediately after successful backend update
      setLocalApplicationStatus(newStatus);
      
      // Refresh the application data in the background
      if (onRefresh) {
        onRefresh();
      }
      
      setShowStatusUpdate(false);
      setStatusNotes('');
      setNewStatus(''); // Reset status selection
    } catch (error) {
      console.error('Failed to update application status:', error);
      // Show user-friendly error message
      alert(`Failed to update application status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const toggleStatusUpdate = () => {
    setShowStatusUpdate(!showStatusUpdate);
    if (!showStatusUpdate) {
      setNewStatus(''); // Reset status selection when opening
      setStatusNotes('');
    }
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
                  `${application.data?.personalInfo?.firstName || application.data?.data?.personalInfo?.firstName || 'Unknown'} ${application.data?.personalInfo?.lastName || application.data?.data?.personalInfo?.lastName || ''}`.trim() ||
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
              <StatusBadge $status={getCurrentStatus()}>
                {getCurrentStatus() !== 'unknown' ? formatStatusName(getCurrentStatus()) : 'Unknown Status'}
              </StatusBadge>
              <Button
                variant="primary"
                onClick={toggleStatusUpdate}
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
                <option value="">Select new status...</option>
                {getValidStatusOptions(getCurrentStatus()).map((status) => (
                  <option key={status} value={status}>
                    {formatStatusName(status)}
                  </option>
                ))}
              </Select>
              {getValidStatusOptions(getCurrentStatus()).length === 0 && (
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  No status changes available for {formatStatusName(getCurrentStatus())}.
                </p>
              )}
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
              <Button 
                variant="primary" 
                onClick={handleStatusUpdate}
                disabled={!newStatus || getValidStatusOptions(getCurrentStatus()).length === 0 || isUpdatingStatus}
              >
                {isUpdatingStatus ? 'Updating...' : 'Update Status'}
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
              References ({extractedReferences.length})
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
                      {getData('personalInfo.firstName') || 'N/A'} {getData('personalInfo.lastName') || ''}
                    </FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Email</FieldLabel>
                    <FieldValue>{getData('personalInfo.email') || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Phone</FieldLabel>
                    <FieldValue>{getData('personalInfo.phone') || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Address</FieldLabel>
                    <FieldValue>
                      {getData('personalInfo.address') || 'N/A'}<br />
                      {getData('personalInfo.city') || 'N/A'}, {getData('personalInfo.state') || 'N/A'} {getData('personalInfo.zipCode') || 'N/A'}
                    </FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Date of Birth</FieldLabel>
                    <FieldValue>
                      {getData('personalInfo.dateOfBirth')
                        ? new Date(getData('personalInfo.dateOfBirth')).toLocaleDateString()
                        : 'N/A'}
                    </FieldValue>
                  </Field>
                </Card>

                <Card>
                  <CardTitle>Household</CardTitle>
                  <Field>
                    <FieldLabel>Household Size</FieldLabel>
                    <FieldValue>{getData('livingsituation.householdSize') || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Housing Type</FieldLabel>
                    <FieldValue>{getData('livingsituation.housingType') || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Own/Rent</FieldLabel>
                    <FieldValue>{getData('livingsituation.isOwned') ? 'Own' : 'Rent'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Has Yard</FieldLabel>
                    <FieldValue>{getData('livingsituation.hasYard') ? 'Yes' : 'No'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Has Allergies</FieldLabel>
                    <FieldValue>{getData('livingsituation.hasAllergies') ? 'Yes' : 'No'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Household Members</FieldLabel>
                    <FieldValue>{getData('answers.household_members')?.length || 0} members</FieldValue>
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
                    <FieldValue>{getData('petExperience.experienceLevel') || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Willing to Train</FieldLabel>
                    <FieldValue>{getData('petExperience.willingToTrain') ? 'Yes' : 'No'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Hours Alone Daily</FieldLabel>
                    <FieldValue>{getData('petExperience.hoursAloneDaily') || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Exercise Plans</FieldLabel>
                    <FieldValue>{getData('petExperience.exercisePlans') || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Currently Has Pets</FieldLabel>
                    <FieldValue>{getData('petExperience.hasPetsCurrently') ? 'Yes' : 'No'}</FieldValue>
                  </Field>
                </Card>
                
                <Card>
                  <CardTitle>References</CardTitle>
                  <Field>
                    <FieldLabel>Veterinarian</FieldLabel>
                    <FieldValue>
                      {getData('references.veterinarian.name') || 'N/A'}
                      {getData('references.veterinarian.clinicName') && 
                        ` - ${getData('references.veterinarian.clinicName')}`}
                    </FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Vet Phone</FieldLabel>
                    <FieldValue>{getData('references.veterinarian.phone') || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Personal References</FieldLabel>
                    <FieldValue>{getData('references.personal')?.length || 0} provided</FieldValue>
                  </Field>
                </Card>
              </Grid>
            </Section>

            <Section>
              <SectionTitle>Application Answers</SectionTitle>
              <Grid>
                <Card>
                  <CardTitle>Adoption Motivation</CardTitle>
                  <FieldVertical>
                    <FieldLabel>Why Adopt</FieldLabel>
                    <FieldValueFullWidth>
                      {getData('answers.why_adopt') || 'N/A'}
                    </FieldValueFullWidth>
                  </FieldVertical>
                  <FieldVertical>
                    <FieldLabel>Exercise Plan</FieldLabel>
                    <FieldValueFullWidth>
                      {getData('answers.exercise_plan') || 'N/A'}
                    </FieldValueFullWidth>
                  </FieldVertical>
                </Card>

                <Card>
                  <CardTitle>Home Details</CardTitle>
                  <Field>
                    <FieldLabel>Yard Size</FieldLabel>
                    <FieldValue>{getData('answers.yard_size') || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Yard Fenced</FieldLabel>
                    <FieldValue>{getData('answers.yard_fenced') ? 'Yes' : 'No'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Hours Pet Alone</FieldLabel>
                    <FieldValue>{getData('answers.hours_alone') || 'N/A'}</FieldValue>
                  </Field>
                  <Field>
                    <FieldLabel>Current Pets</FieldLabel>
                    <FieldValue>{getData('answers.current_pets')?.length || 0} pets</FieldValue>
                  </Field>
                </Card>
              </Grid>
            </Section>

            {getData('answers.previous_pets')?.length > 0 && (
              <Section>
                <SectionTitle>Previous Pet Experience</SectionTitle>
                <Grid>
                  {getData('answers.previous_pets').map((pet: any, index: number) => (
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
                      <FieldVertical>
                        <FieldLabel>What Happened</FieldLabel>
                        <FieldValueFullWidth>
                          {pet.what_happened || 'N/A'}
                        </FieldValueFullWidth>
                      </FieldVertical>
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
              {extractedReferences.length === 0 ? (
                <Card>
                  <p>No references found for this application.</p>
                </Card>
              ) : (
                extractedReferences.map((reference) => {
                  // Use local state if available, otherwise use the reference data
                  const currentStatus = referenceUpdates[reference.id]?.status || reference.status;
                  const currentNotes = referenceUpdates[reference.id]?.notes || reference.notes;
                  
                  return (
                  <ReferenceCard key={reference.id}>
                    <ReferenceHeader>
                      <ReferenceInfo>
                        <ReferenceName>{reference.contactName}</ReferenceName>
                        <ReferenceContact>{reference.contactInfo}</ReferenceContact>
                        <ReferenceRelation>Type: {reference.type}</ReferenceRelation>
                      </ReferenceInfo>
                      <ReferenceStatus $status={currentStatus}>
                        {currentStatus}
                      </ReferenceStatus>
                    </ReferenceHeader>
                    
                    {reference.completedAt && (
                      <Field>
                        <FieldLabel>Last Contacted</FieldLabel>
                        <FieldValue>{new Date(reference.completedAt).toLocaleDateString()}</FieldValue>
                      </Field>
                    )}
                    
                    {reference.completedBy && (
                      <Field>
                        <FieldLabel>Contacted By</FieldLabel>
                        <FieldValue>{reference.completedBy}</FieldValue>
                      </Field>
                    )}

                    {currentNotes && (
                      <ReferenceNotes>{currentNotes}</ReferenceNotes>
                    )}

                    <ReferenceActions>
                      <Button
                        onClick={() => toggleReferenceForm(reference.id)}
                        variant="secondary"
                      >
                        {referenceUpdates[reference.id]?.showForm ? 'Cancel' : 'Update Status'}
                      </Button>
                    </ReferenceActions>

                    {referenceUpdates[reference.id]?.showForm && (
                      <ReferenceForm>
                        <FormField>
                          <Label>Status</Label>
                          <StatusSelect
                            value={referenceUpdates[reference.id]?.status || currentStatus}
                            onChange={(e) => updateReferenceField(reference.id, 'status', e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="contacted">Contacted</option>
                            <option value="verified">Verified</option>
                            <option value="failed">Failed</option>
                          </StatusSelect>
                        </FormField>
                        <FormField>
                          <Label>Notes</Label>
                          <NotesInput
                            value={referenceUpdates[reference.id]?.notes || currentNotes}
                            onChange={(e) => updateReferenceField(reference.id, 'notes', e.target.value)}
                            placeholder="Add notes about this reference check..."
                          />
                        </FormField>
                        <ButtonGroup>
                          <Button 
                            onClick={() => toggleReferenceForm(reference.id)}
                            variant="secondary"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            onClick={() => handleReferenceUpdate(
                              reference.id,
                              referenceUpdates[reference.id]?.status || currentStatus,
                              referenceUpdates[reference.id]?.notes || currentNotes || ''
                            )}
                          >
                            Update Reference
                          </Button>
                        </ButtonGroup>
                      </ReferenceForm>
                    )}
                  </ReferenceCard>
                  );
                })
              )}
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