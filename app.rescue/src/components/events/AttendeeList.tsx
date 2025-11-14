import React from 'react';
import styled from 'styled-components';
import { EventAttendee } from '../../types/events';
import { formatDate } from '@adopt-dont-shop/lib.utils';

interface AttendeeListProps {
  attendees: EventAttendee[];
  onCheckIn?: (userId: string) => void;
}

const ListContainer = styled.div`
  width: 100%;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  background: ${props => props.theme.colors.neutral?.[50] || '#f9fafb'};
  border-bottom: 2px solid ${props => props.theme.colors.neutral?.[200] || '#e5e7eb'};
`;

const TableHeaderCell = styled.th`
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${props => props.theme.text?.secondary || '#6b7280'};
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr<{ $checkedIn?: boolean }>`
  border-bottom: 1px solid ${props => props.theme.colors.neutral?.[200] || '#e5e7eb'};
  transition: background 0.15s ease;

  ${props =>
    props.$checkedIn &&
    `
    background: ${props.theme.colors.primary?.[50] || '#eff6ff'};
  `}

  &:hover {
    background: ${props => props.theme.colors.neutral?.[50] || '#f9fafb'};
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  font-size: 0.875rem;
  color: ${props => props.theme.text?.primary || '#111827'};
`;

const CheckInBadge = styled.span<{ $checkedIn: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 9999px;

  ${props =>
    props.$checkedIn
      ? `
    background: #dcfce7;
    color: #166534;
  `
      : `
    background: #fef3c7;
    color: #92400e;
  `}
`;

const CheckInButton = styled.button`
  padding: 0.375rem 0.75rem;
  border: 1px solid ${props => props.theme.colors.primary?.[600] || '#2563eb'};
  background: white;
  color: ${props => props.theme.colors.primary?.[600] || '#2563eb'};
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.primary?.[600] || '#2563eb'};
    color: white;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: ${props => props.theme.text?.secondary || '#6b7280'};
  font-size: 0.875rem;
`;

const AttendeeList: React.FC<AttendeeListProps> = ({ attendees, onCheckIn }) => {
  if (!attendees || attendees.length === 0) {
    return (
      <ListContainer>
        <EmptyState>No attendees registered yet.</EmptyState>
      </ListContainer>
    );
  }

  return (
    <ListContainer>
      <Table>
        <TableHeader>
          <tr>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Registered</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            {onCheckIn && <TableHeaderCell>Action</TableHeaderCell>}
          </tr>
        </TableHeader>
        <TableBody>
          {attendees.map(attendee => (
            <TableRow key={attendee.userId} $checkedIn={attendee.checkedIn}>
              <TableCell>{attendee.name}</TableCell>
              <TableCell>{attendee.email}</TableCell>
              <TableCell>{formatDate(new Date(attendee.registeredAt))}</TableCell>
              <TableCell>
                <CheckInBadge $checkedIn={attendee.checkedIn}>
                  {attendee.checkedIn
                    ? `✓ Checked In${attendee.checkedInAt ? ` - ${formatDate(new Date(attendee.checkedInAt))}` : ''}`
                    : 'Not Checked In'}
                </CheckInBadge>
              </TableCell>
              {onCheckIn && (
                <TableCell>
                  {!attendee.checkedIn ? (
                    <CheckInButton onClick={() => onCheckIn(attendee.userId)}>
                      Check In
                    </CheckInButton>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#10b981' }}>✓ Checked In</span>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ListContainer>
  );
};

export default AttendeeList;
