import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@adopt-dont-shop/components';
import { describe, it, expect, jest } from '@jest/globals';
import { ReportDetailModal } from './ReportDetailModal';
import type { Report } from '@adopt-dont-shop/lib-moderation';

// Mock the utility functions from lib-moderation
jest.mock('@adopt-dont-shop/lib-moderation', () => ({
  getSeverityLabel: jest.fn((severity: string) => severity.toUpperCase()),
  getStatusLabel: jest.fn((status: string) => status.replace('_', ' ').toUpperCase()),
  formatRelativeTime: jest.fn((date: string) => '2 hours ago'),
}));

const mockReport: Report = {
  reportId: 'report-123',
  reporterId: 'reporter-456',
  reportedEntityType: 'user' as const,
  reportedEntityId: 'user-789',
  category: 'harassment' as const,
  severity: 'high' as const,
  status: 'pending' as const,
  title: 'User sending harassing messages',
  description: 'This user has been sending threatening and harassing messages to multiple users over the past week.',
  createdAt: '2025-10-31T10:00:00Z',
  updatedAt: '2025-10-31T12:00:00Z',
};

const mockReportWithContext = {
  ...mockReport,
  entityContext: {
    type: 'user',
    id: 'user-789',
    displayName: 'John Doe',
    email: 'john@example.com',
    userType: 'adopter',
  },
};

describe('ReportDetailModal', () => {
  it('should hide modal when isOpen is false', () => {
    const { container } = render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={false}
          onClose={jest.fn()}
          report={mockReport}
        />
      </ThemeProvider>
    );

    // Modal overlay should have display: none
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveStyle({ display: 'none' });
  });

  it('should render modal when isOpen is true', () => {
    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={mockReport}
        />
      </ThemeProvider>
    );

    expect(screen.getByText('User sending harassing messages')).toBeInTheDocument();
    expect(screen.getByText(/Reported 2 hours ago/i)).toBeInTheDocument();
  });

  it('should display report status and severity', () => {
    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={mockReport}
        />
      </ThemeProvider>
    );

    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('should display report description', () => {
    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={mockReport}
        />
      </ThemeProvider>
    );

    expect(screen.getByText(/threatening and harassing messages/i)).toBeInTheDocument();
  });

  it('should display report category', () => {
    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={mockReport}
        />
      </ThemeProvider>
    );

    expect(screen.getByText('harassment')).toBeInTheDocument();
  });

  it('should display entity context when available', () => {
    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={mockReportWithContext as any}
        />
      </ThemeProvider>
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Type: adopter/i)).toBeInTheDocument();
  });

  it('should display entity ID when no context available', () => {
    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={mockReport}
        />
      </ThemeProvider>
    );

    expect(screen.getByText(/Entity ID: user-789/i)).toBeInTheDocument();
    expect(screen.getByText('No additional context available')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={onClose}
          report={mockReport}
        />
      </ThemeProvider>
    );

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking overlay', () => {
    const onClose = jest.fn();
    const { container } = render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={onClose}
          report={mockReport}
        />
      </ThemeProvider>
    );

    const overlay = container.firstChild as HTMLElement;
    fireEvent.click(overlay);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when clicking modal content', () => {
    const onClose = jest.fn();
    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={onClose}
          report={mockReport}
        />
      </ThemeProvider>
    );

    const modalTitle = screen.getByText('User sending harassing messages');
    fireEvent.click(modalTitle);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should display timestamps', () => {
    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={mockReport}
        />
      </ThemeProvider>
    );

    // Check that timestamp labels exist
    expect(screen.getByText('Reported')).toBeInTheDocument();
    expect(screen.getByText('Last Updated')).toBeInTheDocument();
  });

  it('should display deleted entity indicator', () => {
    const deletedReport = {
      ...mockReport,
      entityContext: {
        type: 'user',
        id: 'user-789',
        displayName: '[Deleted User]',
        deleted: true,
      },
    };

    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={deletedReport as any}
        />
      </ThemeProvider>
    );

    expect(screen.getByText(/\(Deleted\)/i)).toBeInTheDocument();
  });

  it('should display error indicator for failed entity loading', () => {
    const errorReport = {
      ...mockReport,
      entityContext: {
        type: 'user',
        id: 'user-789',
        displayName: '[Error Loading Entity]',
        error: true,
      },
    };

    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={errorReport as any}
        />
      </ThemeProvider>
    );

    expect(screen.getByText(/\(Error Loading\)/i)).toBeInTheDocument();
  });

  it('should display pet entity context correctly', () => {
    const petReport = {
      ...mockReport,
      reportedEntityType: 'pet' as const,
      entityContext: {
        type: 'pet',
        id: 'pet-123',
        displayName: 'Buddy',
        petType: 'dog',
        breed: 'Golden Retriever',
      },
    };

    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={petReport as any}
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Buddy')).toBeInTheDocument();
    expect(screen.getByText(/dog • Golden Retriever/i)).toBeInTheDocument();
  });

  it('should display rescue entity context correctly', () => {
    const rescueReport = {
      ...mockReport,
      reportedEntityType: 'rescue' as const,
      entityContext: {
        type: 'rescue',
        id: 'rescue-123',
        displayName: 'Happy Paws Rescue',
        city: 'Portland',
        country: 'USA',
      },
    };

    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={rescueReport as any}
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Happy Paws Rescue')).toBeInTheDocument();
    expect(screen.getByText(/Portland, USA/i)).toBeInTheDocument();
  });

  it('should return null when report is null', () => {
    const { container } = render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={null}
        />
      </ThemeProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  it('should display "View Content" button for reported entity', () => {
    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={mockReport}
        />
      </ThemeProvider>
    );

    expect(screen.getByText(/View User Profile/i)).toBeInTheDocument();
  });

  it('should display "View Reporter Profile" button', () => {
    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={mockReport}
        />
      </ThemeProvider>
    );

    expect(screen.getByText(/View Reporter Profile/i)).toBeInTheDocument();
  });

  it('should display entity ID', () => {
    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={mockReport}
        />
      </ThemeProvider>
    );

    // Check for entity ID display
    expect(screen.getByText(mockReport.reportedEntityId)).toBeInTheDocument();
  });

  it('should open entity in new tab when View Content is clicked', () => {
    const mockOpen = jest.fn();
    window.open = mockOpen;

    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={mockReport}
        />
      </ThemeProvider>
    );

    const viewButton = screen.getByText(/View User Profile/i);
    fireEvent.click(viewButton);

    expect(mockOpen).toHaveBeenCalledWith('/users/user-789', '_blank');
  });

  it('should open reporter profile when View Reporter button is clicked', () => {
    const mockOpen = jest.fn();
    window.open = mockOpen;

    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={mockReport}
        />
      </ThemeProvider>
    );

    const viewReporterButton = screen.getByText(/View Reporter Profile/i);
    fireEvent.click(viewReporterButton);

    expect(mockOpen).toHaveBeenCalledWith('/users/reporter-456', '_blank');
  });

  it('should show warning for deleted entities', () => {
    const deletedReport = {
      ...mockReport,
      entityContext: {
        type: 'user',
        id: 'user-789',
        displayName: '[Deleted User]',
        deleted: true,
      },
    };

    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={deletedReport as any}
        />
      </ThemeProvider>
    );

    expect(screen.getByText(/This entity has been deleted/i)).toBeInTheDocument();
  });

  it('should show warning for error loading entities', () => {
    const errorReport = {
      ...mockReport,
      entityContext: {
        type: 'user',
        id: 'user-789',
        displayName: '[Error Loading Entity]',
        error: true,
      },
    };

    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={errorReport as any}
        />
      </ThemeProvider>
    );

    expect(screen.getByText(/There was an error loading this entity/i)).toBeInTheDocument();
  });

  it('should display reporter ID', () => {
    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={mockReport}
        />
      </ThemeProvider>
    );

    expect(screen.getByText(/Reporter ID/i)).toBeInTheDocument();
  });

  it('should display relative time for timestamps', () => {
    render(
      <ThemeProvider>
        <ReportDetailModal
          isOpen={true}
          onClose={jest.fn()}
          report={mockReport}
        />
      </ThemeProvider>
    );

    // Check that formatRelativeTime was called
    const relativeTimeElements = screen.getAllByText('2 hours ago');
    expect(relativeTimeElements.length).toBeGreaterThan(0);
  });
});
