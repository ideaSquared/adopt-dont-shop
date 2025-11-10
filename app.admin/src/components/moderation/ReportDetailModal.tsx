import React from 'react';
import styled from 'styled-components';
import { FiX, FiAlertTriangle, FiUser, FiCalendar, FiFileText, FiExternalLink } from 'react-icons/fi';
import { Report, getSeverityLabel, getStatusLabel, formatRelativeTime } from '@adopt-dont-shop/lib-moderation';

const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContainer = styled.div`
  background: #ffffff;
  border-radius: 12px;
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: #f3f4f6;
    color: #111827;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const Section = styled.div`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const InfoLabel = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
`;

const InfoValue = styled.div`
  font-size: 0.875rem;
  color: #111827;
  font-weight: 500;
`;

const Description = styled.div`
  font-size: 0.875rem;
  color: #374151;
  line-height: 1.6;
  background: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  white-space: pre-wrap;
`;

const Badge = styled.span<{ $variant: 'success' | 'danger' | 'info' | 'neutral' | 'warning' }>`
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-block;

  ${props => {
    switch (props.$variant) {
      case 'success':
        return `
          background: #dcfce7;
          color: #15803d;
        `;
      case 'danger':
        return `
          background: #fee2e2;
          color: #dc2626;
        `;
      case 'info':
        return `
          background: #dbeafe;
          color: #1e40af;
        `;
      case 'warning':
        return `
          background: #fef3c7;
          color: #92400e;
        `;
      case 'neutral':
      default:
        return `
          background: #f3f4f6;
          color: #4b5563;
        `;
    }
  }}
`;

const EntityCard = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
`;

const EntityType = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
`;

const EntityName = styled.div`
  font-size: 1rem;
  color: #111827;
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const EntityDetail = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const Divider = styled.div`
  height: 1px;
  background: #e5e7eb;
  margin: 1.5rem 0;
`;

const ViewContentButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 0.75rem;

  &:hover {
    background: #2563eb;
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const EntityId = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  font-family: monospace;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
`;

const WarningBox = styled.div`
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-top: 0.75rem;
  font-size: 0.875rem;
  color: #92400e;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
`;

export interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report | null;
}

const getStatusBadgeVariant = (status: string): 'success' | 'danger' | 'info' | 'neutral' | 'warning' => {
  switch (status) {
    case 'pending':
      return 'danger';
    case 'under_review':
      return 'info';
    case 'resolved':
      return 'success';
    case 'dismissed':
      return 'neutral';
    case 'escalated':
      return 'warning';
    default:
      return 'neutral';
  }
};

const getSeverityBadgeVariant = (severity: string): 'success' | 'danger' | 'info' | 'neutral' | 'warning' => {
  switch (severity) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
      return 'neutral';
    default:
      return 'neutral';
  }
};

// Helper to generate URLs to view reported content
const getEntityViewUrl = (entityType: string, entityId: string): string | null => {
  switch (entityType) {
    case 'user':
      return `/users/${entityId}`;
    case 'rescue':
      return `/rescues/${entityId}`;
    case 'pet':
      return `/pets/${entityId}`;
    case 'application':
      return `/applications/${entityId}`;
    case 'message':
    case 'conversation':
      return `/chats?messageId=${entityId}`;
    default:
      return null;
  }
};

// Helper to get entity type label
const getEntityTypeLabel = (entityType: string): string => {
  switch (entityType) {
    case 'user':
      return 'User Profile';
    case 'rescue':
      return 'Rescue Organization';
    case 'pet':
      return 'Pet Listing';
    case 'application':
      return 'Application';
    case 'message':
      return 'Message';
    case 'conversation':
      return 'Conversation';
    default:
      return 'Content';
  }
};

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  if (!report) return null;

  const entityContext = (report as any).entityContext;
  const viewUrl = getEntityViewUrl(report.reportedEntityType, report.reportedEntityId);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleViewContent = () => {
    if (viewUrl) {
      window.open(viewUrl, '_blank');
    }
  };

  return (
    <Overlay $isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContainer>
        <ModalHeader>
          <HeaderContent>
            <Title>{report.title}</Title>
            <Subtitle>
              <FiCalendar size={14} />
              Reported {formatRelativeTime(report.createdAt)}
            </Subtitle>
          </HeaderContent>
          <CloseButton onClick={onClose} aria-label="Close">
            <FiX size={20} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <Section>
            <SectionTitle>
              <FiAlertTriangle size={16} />
              Report Status
            </SectionTitle>
            <InfoGrid>
              <InfoItem>
                <InfoLabel>Status</InfoLabel>
                <InfoValue>
                  <Badge $variant={getStatusBadgeVariant(report.status)}>
                    {getStatusLabel(report.status)}
                  </Badge>
                </InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Severity</InfoLabel>
                <InfoValue>
                  <Badge $variant={getSeverityBadgeVariant(report.severity)}>
                    {getSeverityLabel(report.severity)}
                  </Badge>
                </InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Category</InfoLabel>
                <InfoValue>{report.category}</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Report ID</InfoLabel>
                <InfoValue style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {report.reportId.substring(0, 8)}...
                </InfoValue>
              </InfoItem>
            </InfoGrid>
          </Section>

          <Divider />

          <Section>
            <SectionTitle>
              <FiFileText size={16} />
              Description
            </SectionTitle>
            <Description>{report.description}</Description>
          </Section>

          <Divider />

          <Section>
            <SectionTitle>
              <FiUser size={16} />
              Reported Entity
            </SectionTitle>
            <EntityCard>
              <EntityType>{report.reportedEntityType}</EntityType>
              {entityContext ? (
                <>
                  <EntityName>
                    {entityContext.displayName}
                    {entityContext.deleted && ' (Deleted)'}
                    {entityContext.error && ' (Error Loading)'}
                  </EntityName>
                  {entityContext.email && (
                    <EntityDetail>{entityContext.email}</EntityDetail>
                  )}
                  {entityContext.userType && (
                    <EntityDetail>Type: {entityContext.userType}</EntityDetail>
                  )}
                  {entityContext.petType && (
                    <EntityDetail>
                      {entityContext.petType}
                      {entityContext.breed && ` • ${entityContext.breed}`}
                    </EntityDetail>
                  )}
                  {entityContext.city && entityContext.country && (
                    <EntityDetail>
                      {entityContext.city}, {entityContext.country}
                    </EntityDetail>
                  )}

                  <EntityId>
                    <strong>ID:</strong> {report.reportedEntityId}
                  </EntityId>
                </>
              ) : (
                <>
                  <EntityName>Entity ID: {report.reportedEntityId}</EntityName>
                  <EntityDetail>No additional context available</EntityDetail>

                  <EntityId>
                    <strong>Full ID:</strong> {report.reportedEntityId}
                  </EntityId>
                </>
              )}

              {viewUrl && (
                <>
                  <ViewContentButton onClick={handleViewContent}>
                    <FiExternalLink size={16} />
                    View {getEntityTypeLabel(report.reportedEntityType)}
                  </ViewContentButton>
                  {(entityContext?.deleted || entityContext?.error) && (
                    <WarningBox>
                      <FiAlertTriangle size={16} />
                      <div>
                        {entityContext.deleted
                          ? 'This entity has been deleted. The link may not work.'
                          : 'There was an error loading this entity. The link may not work.'}
                      </div>
                    </WarningBox>
                  )}
                </>
              )}
            </EntityCard>
          </Section>

          <Divider />

          <Section>
            <SectionTitle>
              <FiUser size={16} />
              Reporter Information
            </SectionTitle>
            <InfoGrid>
              <InfoItem>
                <InfoLabel>Reporter ID</InfoLabel>
                <InfoValue style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {report.reporterId.substring(0, 8)}...
                </InfoValue>
              </InfoItem>
              {report.reportedUserId && (
                <InfoItem>
                  <InfoLabel>Reported User ID</InfoLabel>
                  <InfoValue style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {report.reportedUserId.substring(0, 8)}...
                  </InfoValue>
                </InfoItem>
              )}
            </InfoGrid>
            <ViewContentButton
              onClick={() => window.open(`/users/${report.reporterId}`, '_blank')}
              style={{ marginTop: '1rem' }}
            >
              <FiExternalLink size={16} />
              View Reporter Profile
            </ViewContentButton>
          </Section>

          <Divider />

          <Section>
            <SectionTitle>
              <FiCalendar size={16} />
              Timeline
            </SectionTitle>
            <InfoGrid>
              <InfoItem>
                <InfoLabel>Reported</InfoLabel>
                <InfoValue>{new Date(report.createdAt).toLocaleString()}</InfoValue>
                <EntityDetail>{formatRelativeTime(report.createdAt)}</EntityDetail>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Last Updated</InfoLabel>
                <InfoValue>{new Date(report.updatedAt).toLocaleString()}</InfoValue>
                <EntityDetail>{formatRelativeTime(report.updatedAt)}</EntityDetail>
              </InfoItem>
            </InfoGrid>
          </Section>
        </ModalBody>
      </ModalContainer>
    </Overlay>
  );
};
