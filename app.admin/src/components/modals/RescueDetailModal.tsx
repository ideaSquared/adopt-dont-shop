import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Button, Heading, Text, DateTime } from '@adopt-dont-shop/lib.components';
import {
  FiX,
  FiMail,
  FiPhone,
  FiMapPin,
  FiGlobe,
  FiUsers,
  FiPackage,
  FiUserPlus,
  FiUserMinus,
  FiCheck,
  FiClock,
} from 'react-icons/fi';
import type {
  AdminRescue,
  RescueStatistics,
  StaffMember,
  StaffInvitation,
  InviteStaffPayload,
} from '@/types/rescue';
import { rescueService } from '@/services/rescueService';

type RescueDetailModalProps = {
  rescueId: string;
  onClose: () => void;
  onUpdate?: () => void;
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContainer = styled.div`
  background: #ffffff;
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #e5e7eb;
    color: #111827;
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
`;

const TabContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 1.5rem;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 0.75rem 1.25rem;
  border: none;
  background: none;
  color: ${props => (props.$active ? props.theme.colors.primary[600] : '#6b7280')};
  font-weight: ${props => (props.$active ? '600' : '500')};
  font-size: 0.875rem;
  cursor: pointer;
  border-bottom: 2px solid
    ${props => (props.$active ? props.theme.colors.primary[600] : 'transparent')};
  margin-bottom: -2px;
  transition: all 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.primary[600]};
  }
`;

const Section = styled.div`
  margin-bottom: 2rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1rem 0;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.25rem;
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const InfoLabel = styled.div`
  font-size: 0.8125rem;
  font-weight: 500;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    font-size: 1rem;
  }
`;

const InfoValue = styled.div`
  font-size: 0.9375rem;
  color: #111827;
  word-break: break-word;
`;

const Badge = styled.span<{ $variant: 'success' | 'warning' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$variant) {
      case 'success':
        return '#d1fae5';
      case 'warning':
        return '#fef3c7';
      case 'danger':
        return '#fee2e2';
    }
  }};
  color: ${props => {
    switch (props.$variant) {
      case 'success':
        return '#065f46';
      case 'warning':
        return '#92400e';
      case 'danger':
        return '#991b1b';
    }
  }};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const StatCard = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
  font-weight: 500;
`;

const StatValue = styled.div`
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
`;

const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #6b7280;
`;

const ErrorMessage = styled.div`
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 1rem;
  color: #991b1b;
  margin-bottom: 1rem;
`;

const StaffList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const StaffCard = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;

  &:hover {
    background: #f9fafb;
  }
`;

const StaffInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
`;

const StaffName = styled.div`
  font-weight: 600;
  color: #111827;
  font-size: 0.9375rem;
`;

const StaffEmail = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
`;

const StaffMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #9ca3af;
`;

const StaffActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    color: #111827;
    border-color: #d1d5db;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const InviteForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  margin-bottom: 1.5rem;
`;

const FormRow = styled.div`
  display: flex;
  gap: 1rem;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1;
`;

const Label = styled.label`
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
`;

const Input = styled.input`
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #111827;
  background: #ffffff;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }
`;

const FormActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const InvitationsList = styled.div`
  margin-top: 2rem;
`;

const InvitationCard = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #fef3c7;
  border-radius: 8px;
  background: #fffbeb;
  margin-bottom: 0.75rem;
`;

const InvitationBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => (props.$status === 'pending' ? '#fef3c7' : '#e5e7eb')};
  color: ${props => (props.$status === 'pending' ? '#92400e' : '#374151')};
`;

export const RescueDetailModal: React.FC<RescueDetailModalProps> = ({
  rescueId,
  onClose,
  onUpdate,
}) => {
  const [rescue, setRescue] = useState<AdminRescue | null>(null);
  const [statistics, setStatistics] = useState<RescueStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'contact' | 'policies' | 'staff' | 'listings'
  >('overview');

  // Staff management state
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTitle, setInviteTitle] = useState('');

  useEffect(() => {
    const fetchRescueDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const rescueData = await rescueService.getById(rescueId, { includeStats: true });
        setRescue(rescueData);

        if (rescueData.statistics) {
          setStatistics(rescueData.statistics);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rescue details');
      } finally {
        setLoading(false);
      }
    };

    fetchRescueDetails();
  }, [rescueId]);

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const fetchStaff = async (showLoading = true) => {
    if (!rescueId) return;

    try {
      if (showLoading) {
        setLoadingStaff(true);
      }
      setStaffError(null);

      const [staffData, invitationsData] = await Promise.all([
        rescueService.getStaff(rescueId, 1, 100),
        rescueService.getInvitations(rescueId),
      ]);

      console.log('Fetched staff:', staffData.data);
      console.log('Fetched invitations:', invitationsData);
      setStaff(staffData.data);
      setInvitations(invitationsData);
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Failed to load staff');
    } finally {
      if (showLoading) {
        setLoadingStaff(false);
      }
    }
  };

  const handleInviteStaff = async () => {
    if (!inviteEmail.trim()) {
      setStaffError('Please enter an email address');
      return;
    }

    try {
      setLoadingStaff(true);
      setStaffError(null);

      const payload: InviteStaffPayload = {
        email: inviteEmail.trim(),
        title: inviteTitle.trim() || undefined,
      };

      const newInvitation = await rescueService.inviteStaff(rescueId, payload);
      console.log('Invitation sent:', newInvitation);

      // Reset form
      setInviteEmail('');
      setInviteTitle('');
      setShowInviteForm(false);

      // Refresh staff list (don't show loading, we're already in loading state)
      await fetchStaff(false);
      console.log('Staff and invitations refreshed');
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleRemoveStaff = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) {
      return;
    }

    try {
      setLoadingStaff(true);
      setStaffError(null);

      await rescueService.removeStaff(rescueId, userId);
      await fetchStaff(false);
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Failed to remove staff member');
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    try {
      setLoadingStaff(true);
      setStaffError(null);

      await rescueService.cancelInvitation(rescueId, invitationId);
      await fetchStaff(false);
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Failed to cancel invitation');
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaff();
    }
  }, [activeTab, rescueId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge $variant='success'>Verified</Badge>;
      case 'pending':
        return <Badge $variant='warning'>Pending</Badge>;
      default:
        return <Badge $variant='danger'>{status}</Badge>;
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <ModalContainer>
        <ModalHeader>
          <HeaderContent>
            <Heading level='h2'>{rescue?.name || 'Rescue Details'}</Heading>
            {rescue && (
              <Text style={{ marginTop: '0.5rem' }}>
                {getStatusBadge(rescue.status)} • Registered {formatDate(rescue.createdAt)}
              </Text>
            )}
          </HeaderContent>
          <CloseButton onClick={onClose}>
            <FiX size={20} />
          </CloseButton>
        </ModalHeader>

        <TabContainer>
          <Tab $active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            Overview
          </Tab>
          <Tab $active={activeTab === 'contact'} onClick={() => setActiveTab('contact')}>
            Contact Info
          </Tab>
          <Tab $active={activeTab === 'policies'} onClick={() => setActiveTab('policies')}>
            Policies
          </Tab>
          <Tab $active={activeTab === 'staff'} onClick={() => setActiveTab('staff')}>
            Staff
          </Tab>
          <Tab $active={activeTab === 'listings'} onClick={() => setActiveTab('listings')}>
            Listings
          </Tab>
        </TabContainer>

        <ModalBody>
          {loading && <LoadingSpinner>Loading rescue details...</LoadingSpinner>}

          {error && <ErrorMessage>{error}</ErrorMessage>}

          {!loading && rescue && (
            <>
              {activeTab === 'overview' && (
                <>
                  <Section>
                    <SectionTitle>Organization Information</SectionTitle>
                    <InfoGrid>
                      <InfoItem>
                        <InfoLabel>Organization Name</InfoLabel>
                        <InfoValue>{rescue.name}</InfoValue>
                      </InfoItem>
                      <InfoItem>
                        <InfoLabel>Status</InfoLabel>
                        <InfoValue>{getStatusBadge(rescue.status)}</InfoValue>
                      </InfoItem>
                      <InfoItem>
                        <InfoLabel>Registration Number</InfoLabel>
                        <InfoValue>{rescue.registrationNumber || 'N/A'}</InfoValue>
                      </InfoItem>
                      <InfoItem>
                        <InfoLabel>EIN</InfoLabel>
                        <InfoValue>{rescue.ein || 'N/A'}</InfoValue>
                      </InfoItem>
                    </InfoGrid>
                  </Section>

                  <Section>
                    <SectionTitle>Location</SectionTitle>
                    <InfoGrid>
                      <InfoItem>
                        <InfoLabel>
                          <FiMapPin /> Address
                        </InfoLabel>
                        <InfoValue>{rescue.address}</InfoValue>
                      </InfoItem>
                      <InfoItem>
                        <InfoLabel>City</InfoLabel>
                        <InfoValue>{rescue.city}</InfoValue>
                      </InfoItem>
                      <InfoItem>
                        <InfoLabel>State/County</InfoLabel>
                        <InfoValue>{rescue.state}</InfoValue>
                      </InfoItem>
                      <InfoItem>
                        <InfoLabel>Postal Code</InfoLabel>
                        <InfoValue>{rescue.zipCode}</InfoValue>
                      </InfoItem>
                    </InfoGrid>
                  </Section>

                  {rescue.description && (
                    <Section>
                      <SectionTitle>Description</SectionTitle>
                      <InfoValue>{rescue.description}</InfoValue>
                    </Section>
                  )}

                  {rescue.mission && (
                    <Section>
                      <SectionTitle>Mission</SectionTitle>
                      <InfoValue>{rescue.mission}</InfoValue>
                    </Section>
                  )}
                </>
              )}

              {activeTab === 'contact' && (
                <Section>
                  <SectionTitle>Contact Details</SectionTitle>
                  <InfoGrid>
                    <InfoItem>
                      <InfoLabel>
                        <FiMail /> Email
                      </InfoLabel>
                      <InfoValue>{rescue.email}</InfoValue>
                    </InfoItem>
                    <InfoItem>
                      <InfoLabel>
                        <FiPhone /> Phone
                      </InfoLabel>
                      <InfoValue>{rescue.phone || 'N/A'}</InfoValue>
                    </InfoItem>
                    <InfoItem>
                      <InfoLabel>
                        <FiGlobe /> Website
                      </InfoLabel>
                      <InfoValue>
                        {rescue.website ? (
                          <a href={rescue.website} target='_blank' rel='noopener noreferrer'>
                            {rescue.website}
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </InfoValue>
                    </InfoItem>
                    <InfoItem>
                      <InfoLabel>Contact Person</InfoLabel>
                      <InfoValue>{rescue.contactPerson || 'N/A'}</InfoValue>
                    </InfoItem>
                  </InfoGrid>
                </Section>
              )}

              {activeTab === 'policies' && (
                <Section>
                  <SectionTitle>Adoption Policies</SectionTitle>
                  {rescue.adoptionPolicies ? (
                    <InfoGrid>
                      <InfoItem>
                        <InfoLabel>Home Visit Required</InfoLabel>
                        <InfoValue>
                          {rescue.adoptionPolicies.requireHomeVisit ? 'Yes' : 'No'}
                        </InfoValue>
                      </InfoItem>
                      <InfoItem>
                        <InfoLabel>References Required</InfoLabel>
                        <InfoValue>
                          {rescue.adoptionPolicies.requireReferences ? 'Yes' : 'No'}
                        </InfoValue>
                      </InfoItem>
                      <InfoItem>
                        <InfoLabel>Minimum References</InfoLabel>
                        <InfoValue>{rescue.adoptionPolicies.minimumReferenceCount}</InfoValue>
                      </InfoItem>
                      <InfoItem>
                        <InfoLabel>Adoption Fee Range</InfoLabel>
                        <InfoValue>
                          £{rescue.adoptionPolicies.adoptionFeeRange.min} - £
                          {rescue.adoptionPolicies.adoptionFeeRange.max}
                        </InfoValue>
                      </InfoItem>
                    </InfoGrid>
                  ) : (
                    <InfoValue>No adoption policies configured</InfoValue>
                  )}
                </Section>
              )}

              {activeTab === 'staff' && (
                <>
                  <Section>
                    <SectionTitle>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>Staff Members ({staff?.length || 0})</span>
                        <Button
                          variant='primary'
                          size='sm'
                          onClick={() => setShowInviteForm(!showInviteForm)}
                        >
                          <FiUserPlus style={{ marginRight: '0.5rem' }} />
                          Invite Staff
                        </Button>
                      </div>
                    </SectionTitle>

                    {staffError && <ErrorMessage>{staffError}</ErrorMessage>}

                    {showInviteForm && (
                      <InviteForm>
                        <h4 style={{ margin: 0, fontSize: '0.9375rem', color: '#111827' }}>
                          Invite New Staff Member
                        </h4>
                        <FormRow>
                          <FormGroup>
                            <Label htmlFor='invite-email'>Email Address *</Label>
                            <Input
                              id='invite-email'
                              type='email'
                              placeholder='staffmember@example.com'
                              value={inviteEmail}
                              onChange={e => setInviteEmail(e.target.value)}
                              disabled={loadingStaff}
                            />
                          </FormGroup>
                          <FormGroup>
                            <Label htmlFor='invite-title'>Job Title (Optional)</Label>
                            <Input
                              id='invite-title'
                              type='text'
                              placeholder='e.g., Veterinarian, Coordinator'
                              value={inviteTitle}
                              onChange={e => setInviteTitle(e.target.value)}
                              disabled={loadingStaff}
                            />
                          </FormGroup>
                        </FormRow>
                        <FormActions>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              setShowInviteForm(false);
                              setInviteEmail('');
                              setInviteTitle('');
                              setStaffError(null);
                            }}
                            disabled={loadingStaff}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant='primary'
                            size='sm'
                            onClick={handleInviteStaff}
                            disabled={loadingStaff || !inviteEmail.trim()}
                          >
                            Send Invitation
                          </Button>
                        </FormActions>
                      </InviteForm>
                    )}

                    {loadingStaff && <LoadingSpinner>Loading staff...</LoadingSpinner>}

                    {!loadingStaff &&
                      (staff?.length || 0) === 0 &&
                      (invitations?.length || 0) === 0 && (
                        <InfoValue>No staff members yet. Invite your first team member!</InfoValue>
                      )}

                    {!loadingStaff && (staff?.length || 0) > 0 && (
                      <StaffList>
                        {staff?.map(member => (
                          <StaffCard key={member.staffMemberId}>
                            <StaffInfo>
                              <StaffName>
                                {member.firstName} {member.lastName}
                                {member.isVerified && (
                                  <FiCheck
                                    style={{
                                      display: 'inline-block',
                                      marginLeft: '0.5rem',
                                      color: '#10b981',
                                    }}
                                    size={16}
                                  />
                                )}
                              </StaffName>
                              <StaffEmail>{member.email}</StaffEmail>
                              <StaffMeta>
                                {member.title && <span>{member.title} •</span>}
                                <span>Added {<DateTime timestamp={member.addedAt} />}</span>
                              </StaffMeta>
                            </StaffInfo>
                            <StaffActions>
                              <IconButton
                                title='Remove staff member'
                                onClick={() => handleRemoveStaff(member.userId)}
                                disabled={loadingStaff}
                              >
                                <FiUserMinus color='#ef4444' />
                              </IconButton>
                            </StaffActions>
                          </StaffCard>
                        ))}
                      </StaffList>
                    )}
                  </Section>

                  {(invitations?.length || 0) > 0 && (
                    <InvitationsList>
                      <Section>
                        <SectionTitle>
                          Pending Invitations ({invitations?.length || 0})
                        </SectionTitle>
                        {invitations?.map(invitation => (
                          <InvitationCard key={invitation.invitationId}>
                            <StaffInfo>
                              <StaffName>{invitation.email}</StaffName>
                              <StaffMeta>
                                {invitation.title && <span>{invitation.title} •</span>}
                                <span>Invited {<DateTime timestamp={invitation.createdAt} />}</span>
                                <span>
                                  • Expires {<DateTime timestamp={invitation.expiresAt} />}
                                </span>
                              </StaffMeta>
                            </StaffInfo>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <InvitationBadge $status={invitation.status}>
                                <FiClock size={12} />
                                {invitation.status}
                              </InvitationBadge>
                              <IconButton
                                title='Cancel invitation'
                                onClick={() => handleCancelInvitation(invitation.invitationId)}
                                disabled={loadingStaff}
                              >
                                <FiX color='#ef4444' />
                              </IconButton>
                            </div>
                          </InvitationCard>
                        ))}
                      </Section>
                    </InvitationsList>
                  )}
                </>
              )}

              {activeTab === 'listings' && (
                <Section>
                  <SectionTitle>Pet Listings</SectionTitle>
                  <InfoValue>Listings management coming soon...</InfoValue>
                </Section>
              )}
            </>
          )}
        </ModalBody>
      </ModalContainer>
    </Overlay>
  );
};
