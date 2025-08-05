import React, { useState, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { formatStatusName } from '../../utils/statusUtils';
import type { ReferenceCheck, HomeVisit, ApplicationTimeline } from '../../types/applications';
import { TimelineEventType } from '../../types/applications';

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

const TimelineContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 0;
`;

const TimelineItem = styled.div`
  display: flex;
  gap: 1rem;
  position: relative;
  padding: 1rem;
  background: #fafbfc;
  border: 1px solid #e1e5e9;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f6f8fa;
    border-color: #d0d7de;
  }
  
  &:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 2rem;
    bottom: -0.75rem;
    width: 2px;
    height: 0.5rem;
    background: #d1d5db;
  }
`;

const TimelineIcon = styled.div<{ $type: string }>`
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  font-size: 1rem;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  ${props => {
    switch (props.$type) {
      case 'status_change':
        return 'background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white;';
      case 'reference_check':
        return 'background: linear-gradient(135deg, #10b981, #059669); color: white;';
      case 'home_visit':
        return 'background: linear-gradient(135deg, #f59e0b, #d97706); color: white;';
      case 'note':
        return 'background: linear-gradient(135deg, #6b7280, #4b5563); color: white;';
      case 'system':
        return 'background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white;';
      default:
        return 'background: linear-gradient(135deg, #d1d5db, #9ca3af); color: #6b7280;';
    }
  }}
`;

const TimelineContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const TimelineHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.75rem;
`;

const TimelineTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  flex: 1;
`;

const TimelineTimestamp = styled.span`
  font-size: 0.8125rem;
  color: #6b7280;
  white-space: nowrap;
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 500;
`;

const TimelineDescription = styled.p`
  font-size: 0.9375rem;
  color: #4b5563;
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
`;

const TimelineUser = styled.span`
  font-size: 0.8125rem;
  color: #6b7280;
  font-style: italic;
  padding: 0.25rem 0.5rem;
  background: #f9fafb;
  border-radius: 0.25rem;
  display: inline-block;
`;

const TimelineData = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 1rem;
  margin: 0.75rem 0;
  font-size: 0.8125rem;
  
  strong {
    color: #374151;
    display: block;
    margin-bottom: 0.5rem;
  }
  
  pre {
    margin: 0;
    color: #6b7280;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    overflow-x: auto;
  }
`;

const AddEventForm = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const AddEventTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &::before {
    content: '✏️';
    font-size: 1.2em;
  }
`;

const FormRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  
  @media (max-width: 640px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const FormGroup = styled.div`
  flex: 1;
`;

const FormLabel = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const FormSelect = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: white;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const FormTextarea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  min-height: 5rem;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: #9ca3af;
  }
`;

const FormActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1rem;
`;

const EmptyTimeline = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: #6b7280;
  background: #fafbfc;
  border: 2px dashed #d1d5db;
  border-radius: 0.75rem;
  
  p {
    margin: 0 0 0.5rem 0;
    
    &:first-child {
      font-size: 1.125rem;
      font-weight: 500;
      color: #4b5563;
      margin-bottom: 1rem;
    }
    
    &:last-child {
      font-size: 0.9375rem;
      line-height: 1.5;
    }
  }
`;

const TabPanel = styled.div<{ $active: boolean }>`
  display: ${props => props.$active ? 'block' : 'none'};
  padding: 1.5rem;
`;

const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
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

// Home Visit Styled Components
const ScheduleVisitForm = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const ScheduleVisitTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &::before {
    content: '🏠';
    font-size: 1.2em;
  }
`;

const FormInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: white;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const EmptyVisits = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: #6b7280;
  background: #fafbfc;
  border: 2px dashed #d1d5db;
  border-radius: 0.75rem;
  
  p {
    margin: 0 0 0.5rem 0;
    
    &:first-child {
      font-size: 1.125rem;
      font-weight: 500;
      color: #4b5563;
      margin-bottom: 1rem;
    }
    
    &:last-child {
      font-size: 0.9375rem;
      line-height: 1.5;
    }
  }
`;

const VisitCard = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const VisitHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
`;

const VisitInfo = styled.div``;

const VisitDate = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const VisitTime = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.25rem 0;
`;

const VisitStaff = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
`;

const VisitStatus = styled.span<{ $status: string }>`
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
  
  ${props => {
    switch (props.$status) {
      case 'scheduled':
        return 'background: #dbeafe; color: #1e40af;';
      case 'in_progress':
        return 'background: #fef3c7; color: #92400e;';
      case 'completed':
        return 'background: #dcfce7; color: #166534;';
      case 'cancelled':
        return 'background: #fecaca; color: #dc2626;';
      default:
        return 'background: #f3f4f6; color: #374151;';
    }
  }}
`;

const VisitNotes = styled.div`
  font-size: 0.875rem;
  color: #374151;
  background: #f9fafb;
  border-radius: 0.375rem;
  padding: 0.75rem;
  margin: 1rem 0;
  
  strong {
    display: block;
    margin-bottom: 0.5rem;
    color: #1f2937;
  }
`;

const VisitCompletedInfo = styled.div`
  margin: 1rem 0;
`;

const VisitOutcome = styled.span<{ $outcome: string }>`
  display: inline-flex;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
  
  ${props => {
    switch (props.$outcome) {
      case 'approved':
        return 'background: #dcfce7; color: #166534;';
      case 'conditional':
        return 'background: #fef3c7; color: #92400e;';
      case 'rejected':
        return 'background: #fecaca; color: #dc2626;';
      default:
        return 'background: #f3f4f6; color: #374151;';
    }
  }}
`;

const VisitActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  flex-wrap: wrap;
`;

const RescheduleForm = styled.div`
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-top: 1rem;
`;

const RescheduleTitle = styled.h5`
  font-size: 0.875rem;
  font-weight: 600;
  color: #92400e;
  margin: 0 0 1rem 0;
`;

const CompleteVisitForm = styled.div`
  background: #ecfdf5;
  border: 1px solid #10b981;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-top: 1rem;
`;

const CompleteVisitTitle = styled.h5`
  font-size: 0.875rem;
  font-weight: 600;
  color: #047857;
  margin: 0 0 1rem 0;
`;

const VisitDetailsModal = styled.div`
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
`;

const VisitDetailsContent = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

const VisitDetailsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  
  h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
  }
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
  onScheduleVisit,
  onUpdateVisit,
  onAddTimelineEvent,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'references' | 'visits' | 'timeline'>('details');
  const [statusNotes, setStatusNotes] = useState('');
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [referenceUpdates, setReferenceUpdates] = useState<Record<string, { status: string; notes: string; showForm: boolean }>>({});
  
  // Timeline state
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventType, setNewEventType] = useState(TimelineEventType.NOTE_ADDED);
  const [newEventDescription, setNewEventDescription] = useState('');
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  
  // Local state for optimistic application status updates
  const [localApplicationStatus, setLocalApplicationStatus] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Home Visits state
  const [showScheduleVisit, setShowScheduleVisit] = useState(false);
  const [visitForm, setVisitForm] = useState({
    scheduledDate: '',
    scheduledTime: '',
    assignedStaff: '',
    notes: ''
  });
  const [isSchedulingVisit, setIsSchedulingVisit] = useState(false);
  const [editingVisit, setEditingVisit] = useState<string | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    scheduledDate: '',
    scheduledTime: '',
    reason: ''
  });
  const [completingVisit, setCompletingVisit] = useState<string | null>(null);
  const [completeForm, setCompleteForm] = useState({
    outcome: '' as 'approved' | 'rejected' | 'conditional' | '',
    notes: '',
    conditions: ''
  });
  const [viewingVisit, setViewingVisit] = useState<string | null>(null);

  // Helper functions for timeline
  const formatTimelineTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
      });
    }
  };

  const getTimelineIcon = (eventType: string) => {
    switch (eventType) {
      case 'status_change': return '📋';
      case 'reference_check': return '📞';
      case 'home_visit': return '🏠';
      case 'note': return '📝';
      case 'system': return '⚙️';
      default: return '•';
    }
  };

  const getEventTitle = (event: string) => {
    switch (event) {
      case 'status_change': return 'Status Updated';
      case 'reference_check': return 'Reference Check';
      case 'home_visit': return 'Home Visit';
      case 'note': return 'Note Added';
      case 'system': return 'System Event';
      default: 
        // Convert snake_case to Title Case with proper spacing
        return event
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
    }
  };

  const handleAddEvent = async () => {
    if (!newEventDescription.trim()) return;
    
    try {
      setIsAddingEvent(true);
      await onAddTimelineEvent(newEventType, newEventDescription.trim());
      setNewEventDescription('');
      setNewEventType(TimelineEventType.NOTE_ADDED);
      setShowAddEvent(false);
    } catch (error) {
      console.error('Failed to add timeline event:', error);
      alert('Failed to add timeline event. Please try again.');
    } finally {
      setIsAddingEvent(false);
    }
  };

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

  // Clear local state when application changes
  useEffect(() => {
    setReferenceUpdates({});
    setLocalApplicationStatus(null); // Clear local status when application changes
    
    // Clear home visit forms
    setShowScheduleVisit(false);
    setEditingVisit(null);
    setCompletingVisit(null);
    setViewingVisit(null);
    setVisitForm({
      scheduledDate: '',
      scheduledTime: '',
      assignedStaff: '',
      notes: ''
    });
    setRescheduleForm({
      scheduledDate: '',
      scheduledTime: '',
      reason: ''
    });
    setCompleteForm({
      outcome: '',
      notes: '',
      conditions: ''
    });
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

  // Home Visit Handlers
  const handleScheduleVisit = async () => {
    try {
      setIsSchedulingVisit(true);
      await onScheduleVisit({
        scheduledDate: visitForm.scheduledDate,
        scheduledTime: visitForm.scheduledTime,
        assignedStaff: visitForm.assignedStaff,
        notes: visitForm.notes
      });
      
      // Reset form and close modal
      setVisitForm({
        scheduledDate: '',
        scheduledTime: '',
        assignedStaff: '',
        notes: ''
      });
      setShowScheduleVisit(false);
      
      // Refresh data if callback provided
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to schedule visit:', error);
      alert(`Failed to schedule visit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSchedulingVisit(false);
    }
  };

  const handleMarkVisitInProgress = async (visitId: string) => {
    try {
      await onUpdateVisit(visitId, { 
        status: 'in_progress',
        startedAt: new Date().toISOString()
      });
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to mark visit as in progress:', error);
      alert(`Failed to update visit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRescheduleVisit = async (visitId: string) => {
    try {
      // Just update the date/time, stay in 'scheduled' status
      await onUpdateVisit(visitId, {
        scheduledDate: rescheduleForm.scheduledDate,
        scheduledTime: rescheduleForm.scheduledTime,
        notes: rescheduleForm.reason ? `Rescheduled: ${rescheduleForm.reason}` : undefined
      });
      
      // Reset form and close modal
      setRescheduleForm({
        scheduledDate: '',
        scheduledTime: '',
        reason: ''
      });
      setEditingVisit(null);
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to reschedule visit:', error);
      alert(`Failed to reschedule visit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCompleteVisit = async (visitId: string) => {
    try {
      const updateData: any = {
        status: 'completed',
        outcome: completeForm.outcome,
        notes: completeForm.notes,
        completedAt: new Date().toISOString()
      };

      if (completeForm.outcome === 'conditional' && completeForm.conditions) {
        updateData.conditions = completeForm.conditions;
      }

      await onUpdateVisit(visitId, updateData);
      
      // Reset form and close modal
      setCompleteForm({
        outcome: '',
        notes: '',
        conditions: ''
      });
      setCompletingVisit(null);
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to complete visit:', error);
      alert(`Failed to complete visit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancelVisit = async (visitId: string) => {
    const reason = prompt('Please enter a reason for cancelling this visit:');
    if (!reason) {
      return; // User cancelled or didn't provide reason
    }

    try {
      await onUpdateVisit(visitId, {
        status: 'cancelled',
        cancelReason: reason,
        cancelledAt: new Date().toISOString()
      });
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to cancel visit:', error);
      alert(`Failed to cancel visit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
              <SectionHeader>
                <SectionTitle>Home Visits</SectionTitle>
                <Button
                  variant="primary"
                  onClick={() => setShowScheduleVisit(true)}
                  disabled={homeVisits.some(v => v.status === 'scheduled' || v.status === 'in_progress')}
                >
                  {homeVisits.some(v => v.status === 'scheduled' || v.status === 'in_progress') 
                    ? 'Visit Already Scheduled' 
                    : 'Schedule Visit'
                  }
                </Button>
              </SectionHeader>

              {showScheduleVisit && (
                <ScheduleVisitForm>
                  <ScheduleVisitTitle>Schedule Home Visit</ScheduleVisitTitle>
                  <FormRow>
                    <FormGroup>
                      <FormLabel>Date</FormLabel>
                      <FormInput
                        type="date"
                        value={visitForm.scheduledDate}
                        onChange={(e) => setVisitForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </FormGroup>
                    <FormGroup>
                      <FormLabel>Time</FormLabel>
                      <FormInput
                        type="time"
                        value={visitForm.scheduledTime}
                        onChange={(e) => setVisitForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                      />
                    </FormGroup>
                  </FormRow>
                  <FormRow>
                    <FormGroup>
                      <FormLabel>Assigned Staff</FormLabel>
                      <FormSelect
                        value={visitForm.assignedStaff}
                        onChange={(e) => setVisitForm(prev => ({ ...prev, assignedStaff: e.target.value }))}
                      >
                        <option value="">Select staff member...</option>
                        <option value="John Smith">John Smith</option>
                        <option value="Sarah Johnson">Sarah Johnson</option>
                        <option value="Mike Davis">Mike Davis</option>
                        <option value="Lisa Wilson">Lisa Wilson</option>
                      </FormSelect>
                    </FormGroup>
                  </FormRow>
                  <FormRow>
                    <FormGroup>
                      <FormLabel>Visit Notes (optional)</FormLabel>
                      <FormTextarea
                        value={visitForm.notes}
                        onChange={(e) => setVisitForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Any special instructions or notes for the visit..."
                        rows={3}
                      />
                    </FormGroup>
                  </FormRow>
                  <FormActions>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowScheduleVisit(false);
                        setVisitForm({
                          scheduledDate: '',
                          scheduledTime: '',
                          assignedStaff: '',
                          notes: ''
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleScheduleVisit}
                      disabled={!visitForm.scheduledDate || !visitForm.scheduledTime || !visitForm.assignedStaff || isSchedulingVisit}
                    >
                      {isSchedulingVisit ? 'Scheduling...' : 'Schedule Visit'}
                    </Button>
                  </FormActions>
                </ScheduleVisitForm>
              )}

              {homeVisits.length === 0 ? (
                <EmptyVisits>
                  <p>No home visits scheduled yet.</p>
                  <p>Schedule a home visit to assess the applicant's living situation and suitability for pet adoption.</p>
                </EmptyVisits>
              ) : (
                homeVisits.map((visit) => (
                  <VisitCard key={visit.id}>
                    <VisitHeader>
                      <VisitInfo>
                        <VisitDate>
                          {new Date(visit.scheduledDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </VisitDate>
                        <VisitTime>at {visit.scheduledTime}</VisitTime>
                        <VisitStaff>Assigned to: {visit.assignedStaff}</VisitStaff>
                      </VisitInfo>
                      <VisitStatus $status={visit.status}>
                        {visit.status.replace('_', ' ').toUpperCase()}
                      </VisitStatus>
                    </VisitHeader>

                    {visit.notes && (
                      <VisitNotes>
                        <strong>Visit Notes:</strong>
                        <div>{visit.notes}</div>
                      </VisitNotes>
                    )}

                    {visit.completedAt && (
                      <VisitCompletedInfo>
                        <Field>
                          <FieldLabel>Completed On</FieldLabel>
                          <FieldValue>
                            {new Date(visit.completedAt).toLocaleDateString()} at{' '}
                            {new Date(visit.completedAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </FieldValue>
                        </Field>
                        {visit.outcome && (
                          <Field>
                            <FieldLabel>Outcome</FieldLabel>
                            <FieldValue>
                              <VisitOutcome $outcome={visit.outcome}>
                                {visit.outcome.charAt(0).toUpperCase() + visit.outcome.slice(1)}
                              </VisitOutcome>
                            </FieldValue>
                          </Field>
                        )}
                      </VisitCompletedInfo>
                    )}

                    <VisitActions>
                      {visit.status === 'scheduled' && (
                        <>
                          <Button
                            variant="primary"
                            onClick={() => handleMarkVisitInProgress(visit.id)}
                          >
                            🏁 Start Visit
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setEditingVisit(visit.id);
                              setRescheduleForm({
                                scheduledDate: visit.scheduledDate,
                                scheduledTime: visit.scheduledTime,
                                reason: ''
                              });
                            }}
                          >
                            📅 Reschedule
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => handleCancelVisit(visit.id)}
                          >
                            ❌ Cancel Visit
                          </Button>
                        </>
                      )}
                      
                      {visit.status === 'in_progress' && (
                        <>
                          <Button
                            variant="primary"
                            onClick={() => setCompletingVisit(visit.id)}
                          >
                            ✅ Complete Visit
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => handleCancelVisit(visit.id)}
                          >
                            ❌ Cancel Visit
                          </Button>
                        </>
                      )}

                      {visit.status === 'completed' && (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => setViewingVisit(visit.id)}
                          >
                            👁️ View Details
                          </Button>
                          <Button
                            variant="primary"
                            onClick={() => setShowScheduleVisit(true)}
                          >
                            🏠 Schedule Follow-up
                          </Button>
                        </>
                      )}

                      {visit.status === 'cancelled' && (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => setViewingVisit(visit.id)}
                          >
                            👁️ View Details
                          </Button>
                          <Button
                            variant="primary"
                            onClick={() => setShowScheduleVisit(true)}
                          >
                            🏠 Schedule New Visit
                          </Button>
                        </>
                      )}
                    </VisitActions>

                    {/* Reschedule Form */}
                    {editingVisit === visit.id && (
                      <RescheduleForm>
                        <RescheduleTitle>Reschedule Home Visit</RescheduleTitle>
                        <FormRow>
                          <FormGroup>
                            <FormLabel>New Date</FormLabel>
                            <FormInput
                              type="date"
                              value={rescheduleForm.scheduledDate}
                              onChange={(e) => setRescheduleForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </FormGroup>
                          <FormGroup>
                            <FormLabel>New Time</FormLabel>
                            <FormInput
                              type="time"
                              value={rescheduleForm.scheduledTime}
                              onChange={(e) => setRescheduleForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                            />
                          </FormGroup>
                        </FormRow>
                        <FormRow>
                          <FormGroup>
                            <FormLabel>Reason for Rescheduling</FormLabel>
                            <FormTextarea
                              value={rescheduleForm.reason}
                              onChange={(e) => setRescheduleForm(prev => ({ ...prev, reason: e.target.value }))}
                              placeholder="Why is this visit being rescheduled?"
                              rows={2}
                            />
                          </FormGroup>
                        </FormRow>
                        <FormActions>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setEditingVisit(null);
                              setRescheduleForm({
                                scheduledDate: visit.scheduledDate,
                                scheduledTime: visit.scheduledTime,
                                reason: ''
                              });
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            onClick={() => handleRescheduleVisit(visit.id)}
                            disabled={!rescheduleForm.scheduledDate || !rescheduleForm.scheduledTime || !rescheduleForm.reason}
                          >
                            Reschedule Visit
                          </Button>
                        </FormActions>
                      </RescheduleForm>
                    )}

                    {/* Complete Visit Form */}
                    {completingVisit === visit.id && (
                      <CompleteVisitForm>
                        <CompleteVisitTitle>Complete Home Visit</CompleteVisitTitle>
                        <FormRow>
                          <FormGroup>
                            <FormLabel>Visit Outcome</FormLabel>
                            <FormSelect
                              value={completeForm.outcome}
                              onChange={(e) => setCompleteForm(prev => ({ 
                                ...prev, 
                                outcome: e.target.value as 'approved' | 'rejected' | 'conditional' 
                              }))}
                            >
                              <option value="">Select outcome...</option>
                              <option value="approved">Approved - Home is suitable</option>
                              <option value="conditional">Conditional - Some concerns need addressing</option>
                              <option value="rejected">Rejected - Home is not suitable</option>
                            </FormSelect>
                          </FormGroup>
                        </FormRow>
                        <FormRow>
                          <FormGroup>
                            <FormLabel>Visit Summary</FormLabel>
                            <FormTextarea
                              value={completeForm.notes}
                              onChange={(e) => setCompleteForm(prev => ({ ...prev, notes: e.target.value }))}
                              placeholder="Provide a detailed summary of the home visit findings..."
                              rows={4}
                            />
                          </FormGroup>
                        </FormRow>
                        {completeForm.outcome === 'conditional' && (
                          <FormRow>
                            <FormGroup>
                              <FormLabel>Conditions to Address</FormLabel>
                              <FormTextarea
                                value={completeForm.conditions}
                                onChange={(e) => setCompleteForm(prev => ({ ...prev, conditions: e.target.value }))}
                                placeholder="List specific conditions that need to be met..."
                                rows={3}
                              />
                            </FormGroup>
                          </FormRow>
                        )}
                        <FormActions>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setCompletingVisit(null);
                              setCompleteForm({
                                outcome: '',
                                notes: '',
                                conditions: ''
                              });
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            onClick={() => handleCompleteVisit(visit.id)}
                            disabled={!completeForm.outcome || !completeForm.notes}
                          >
                            Complete Visit
                          </Button>
                        </FormActions>
                      </CompleteVisitForm>
                    )}
                  </VisitCard>
                ))
              )}
            </Section>
          </TabPanel>

          {/* Timeline Tab */}
          <TabPanel $active={activeTab === 'timeline'}>
            <Section>
              <SectionHeader>
                <SectionTitle>Application Timeline</SectionTitle>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setShowAddEvent(!showAddEvent)}
                >
                  {showAddEvent ? 'Cancel' : 'Add Event'}
                </Button>
              </SectionHeader>

              {showAddEvent && (
                <AddEventForm>
                  <AddEventTitle>Add Timeline Event</AddEventTitle>
                  <FormRow>
                    <FormGroup>
                      <FormLabel>Event Type</FormLabel>
                      <FormSelect
                        value={newEventType}
                        onChange={(e) => setNewEventType(e.target.value as TimelineEventType)}
                      >
                        <option value={TimelineEventType.NOTE_ADDED}>Note</option>
                        <option value={TimelineEventType.REFERENCE_CONTACTED}>Reference Check</option>
                        <option value={TimelineEventType.HOME_VISIT_SCHEDULED}>Home Visit</option>
                        <option value={TimelineEventType.MANUAL_OVERRIDE}>Manual Override</option>
                      </FormSelect>
                    </FormGroup>
                  </FormRow>
                  <FormRow>
                    <FormGroup>
                      <FormLabel>Description</FormLabel>
                      <FormTextarea
                        value={newEventDescription}
                        onChange={(e) => setNewEventDescription(e.target.value)}
                        placeholder="Enter event description..."
                        rows={3}
                      />
                    </FormGroup>
                  </FormRow>
                  <FormActions>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowAddEvent(false);
                        setNewEventDescription('');
                        setNewEventType(TimelineEventType.NOTE_ADDED);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleAddEvent}
                      disabled={!newEventDescription.trim() || isAddingEvent}
                    >
                      {isAddingEvent ? 'Adding...' : 'Add Event'}
                    </Button>
                  </FormActions>
                </AddEventForm>
              )}

              <TimelineContainer>
                {timeline.length === 0 ? (
                  <EmptyTimeline>
                    <p>No timeline events yet.</p>
                    <p>Timeline events will appear here as actions are taken on this application.</p>
                  </EmptyTimeline>
                ) : (
                  timeline
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((event) => (
                      <TimelineItem key={event.id}>
                        <TimelineIcon $type={event.event}>
                          {getTimelineIcon(event.event)}
                        </TimelineIcon>
                        <TimelineContent>
                          <TimelineHeader>
                            <TimelineTitle>{getEventTitle(event.event)}</TimelineTitle>
                            <TimelineTimestamp>
                              {formatTimelineTimestamp(event.timestamp)}
                            </TimelineTimestamp>
                          </TimelineHeader>
                          <TimelineDescription>
                            {event.event === 'status_change' && event.data?.newStatus
                              ? `Status changed to: ${formatStatusName(event.data.newStatus)}`
                              : event.description
                            }
                          </TimelineDescription>
                          {event.data && Object.keys(event.data).length > 0 && (
                            <TimelineData>
                              <strong>Additional Details:</strong>
                              {event.data.oldStatus && event.data.newStatus ? (
                                <div style={{ marginTop: '0.5rem' }}>
                                  <span style={{ color: '#ef4444' }}>From: {formatStatusName(event.data.oldStatus)}</span>
                                  <br />
                                  <span style={{ color: '#10b981' }}>To: {formatStatusName(event.data.newStatus)}</span>
                                  {event.data.notes && (
                                    <>
                                      <br />
                                      <span style={{ color: '#6b7280' }}>Notes: {event.data.notes}</span>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <pre>{JSON.stringify(event.data, null, 2)}</pre>
                              )}
                            </TimelineData>
                          )}
                          <TimelineUser>by {event.userName}</TimelineUser>
                        </TimelineContent>
                      </TimelineItem>
                    ))
                )}
              </TimelineContainer>
            </Section>
          </TabPanel>
        </Content>
      </Modal>

      {/* Visit Details Modal */}
      {viewingVisit && homeVisits.find(v => v.id === viewingVisit) && (
        <VisitDetailsModal onClick={() => setViewingVisit(null)}>
          <VisitDetailsContent onClick={(e) => e.stopPropagation()}>
            <VisitDetailsHeader>
              <h4>Visit Details</h4>
              <Button onClick={() => setViewingVisit(null)}>×</Button>
            </VisitDetailsHeader>
            <div style={{ padding: '1rem' }}>
              {(() => {
                const visit = homeVisits.find(v => v.id === viewingVisit);
                if (!visit) return null;
                
                return (
                  <>
                    <Field>
                      <FieldLabel>Original Date</FieldLabel>
                      <FieldValue>
                        {new Date(visit.scheduledDate).toLocaleDateString()} at {visit.scheduledTime}
                      </FieldValue>
                    </Field>
                    <Field>
                      <FieldLabel>Staff Member</FieldLabel>
                      <FieldValue>{visit.assignedStaff}</FieldValue>
                    </Field>
                    <Field>
                      <FieldLabel>Status</FieldLabel>
                      <FieldValue>
                        <VisitStatus $status={visit.status}>
                          {visit.status.replace('_', ' ').toUpperCase()}
                        </VisitStatus>
                      </FieldValue>
                    </Field>
                    {visit.outcome && (
                      <Field>
                        <FieldLabel>Outcome</FieldLabel>
                        <FieldValue>
                          <VisitOutcome $outcome={visit.outcome}>
                            {visit.outcome.charAt(0).toUpperCase() + visit.outcome.slice(1)}
                          </VisitOutcome>
                        </FieldValue>
                      </Field>
                    )}
                    {visit.cancelReason && (
                      <FieldVertical>
                        <FieldLabel>Cancellation Reason</FieldLabel>
                        <FieldValueFullWidth>{visit.cancelReason}</FieldValueFullWidth>
                      </FieldVertical>
                    )}
                    {visit.completedAt && (
                      <Field>
                        <FieldLabel>Completed At</FieldLabel>
                        <FieldValue>
                          {new Date(visit.completedAt).toLocaleDateString()} at {new Date(visit.completedAt).toLocaleTimeString()}
                        </FieldValue>
                      </Field>
                    )}
                    {visit.cancelledAt && (
                      <Field>
                        <FieldLabel>Cancelled At</FieldLabel>
                        <FieldValue>
                          {new Date(visit.cancelledAt).toLocaleDateString()} at {new Date(visit.cancelledAt).toLocaleTimeString()}
                        </FieldValue>
                      </Field>
                    )}
                    {visit.notes && (
                      <FieldVertical>
                        <FieldLabel>Visit Summary</FieldLabel>
                        <FieldValueFullWidth>{visit.notes}</FieldValueFullWidth>
                      </FieldVertical>
                    )}
                    {visit.outcomeNotes && (
                      <FieldVertical>
                        <FieldLabel>Outcome Notes</FieldLabel>
                        <FieldValueFullWidth>{visit.outcomeNotes}</FieldValueFullWidth>
                      </FieldVertical>
                    )}
                  </>
                );
              })()}
            </div>
          </VisitDetailsContent>
        </VisitDetailsModal>
      )}
    </Overlay>
  );
};

export default ApplicationReview;