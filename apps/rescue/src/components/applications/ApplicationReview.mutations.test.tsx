/**
 * Behaviour: the review modal is driven by the real `useApplicationDetails`
 * hook. A failed sub-action (reference check, home visit, timeline event) must
 * keep the user's input and show the error toast, never replace the review
 * with the full-page load error. A successful save must refetch in the
 * background without tearing the review down.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { toast } from '@adopt-dont-shop/lib.components';
import { fireEvent, within } from '@testing-library/react';
import { renderWithProviders, screen, waitFor } from '../../test-utils';

const serviceMocks = vi.hoisted(() => ({
  getApplicationById: vi.fn(),
  getReferenceChecks: vi.fn(),
  getHomeVisits: vi.fn(),
  getApplicationTimeline: vi.fn(),
  updateReferenceCheck: vi.fn(),
  scheduleHomeVisit: vi.fn(),
  updateHomeVisit: vi.fn(),
  addTimelineEvent: vi.fn(),
  transitionStage: vi.fn(),
}));

vi.mock('../../services/applicationService', () => ({
  RescueApplicationService: class {
    getApplicationById = serviceMocks.getApplicationById;
    getReferenceChecks = serviceMocks.getReferenceChecks;
    getHomeVisits = serviceMocks.getHomeVisits;
    getApplicationTimeline = serviceMocks.getApplicationTimeline;
    updateReferenceCheck = serviceMocks.updateReferenceCheck;
    scheduleHomeVisit = serviceMocks.scheduleHomeVisit;
    updateHomeVisit = serviceMocks.updateHomeVisit;
    addTimelineEvent = serviceMocks.addTimelineEvent;
    transitionStage = serviceMocks.transitionStage;
  },
}));

vi.mock('../../services/fosterService', () => ({
  fosterService: { list: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../hooks/useStaff', () => ({
  useStaff: () => ({
    staff: [
      {
        id: 's1',
        userId: 'u1',
        rescueId: 'r1',
        firstName: 'Sam',
        lastName: 'Carer',
        email: 'sam@example.com',
        title: 'Coordinator',
        isVerified: true,
        addedAt: '2024-01-01',
      },
    ],
    loading: false,
  }),
}));

import { useApplicationDetails } from '../../hooks/useApplications';
import ApplicationReview from './ApplicationReview';

const APPLICATION = {
  id: 'app1',
  status: 'submitted',
  petName: 'Rex',
  references: [{ id: 'ref1', name: 'Jane Smith', phone: '555-0124', relationship: 'friend' }],
};

const Harness = () => {
  const details = useApplicationDetails('app1');
  if (!details.application) {
    return null;
  }
  return (
    <ApplicationReview
      application={details.application}
      references={details.references}
      homeVisits={details.homeVisits}
      timeline={details.timeline}
      timelineError={details.timelineError}
      referencesError={details.referencesError}
      homeVisitsError={details.homeVisitsError}
      loading={details.loading}
      error={details.error}
      onClose={() => undefined}
      onStatusUpdate={() => undefined}
      onStageTransition={details.transitionStage}
      onReferenceUpdate={details.updateReferenceCheck}
      onScheduleVisit={details.scheduleHomeVisit}
      onUpdateVisit={details.updateHomeVisit}
      onAddTimelineEvent={details.addTimelineEvent}
      onRefresh={details.refetch}
    />
  );
};

const openReview = async () => {
  const user = userEvent.setup();
  renderWithProviders(<Harness />);
  await screen.findByText('Application for Rex');
  return user;
};

describe('ApplicationReview sub-action failures', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    serviceMocks.getApplicationById.mockResolvedValue(APPLICATION);
    serviceMocks.getReferenceChecks.mockResolvedValue([]);
    serviceMocks.getHomeVisits.mockResolvedValue([]);
    serviceMocks.getApplicationTimeline.mockResolvedValue([]);
  });

  it('keeps the timeline form and its text open when adding an event fails', async () => {
    serviceMocks.addTimelineEvent.mockRejectedValue(new Error('boom'));
    const user = await openReview();

    await user.click(screen.getByRole('tab', { name: /timeline/i }));
    await user.click(screen.getByRole('button', { name: 'Add Event' }));
    await user.type(screen.getByLabelText('Description'), 'Called the applicant');
    await user.click(screen.getAllByRole('button', { name: 'Add Event' }).at(-1) as HTMLElement);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to add timeline event/i),
        expect.objectContaining({ action: expect.objectContaining({ label: 'Retry' }) })
      )
    );
    expect(screen.getByLabelText('Description')).toHaveValue('Called the applicant');
    expect(screen.getByText('Application for Rex')).toBeInTheDocument();
    expect(screen.queryByText('Error loading application')).not.toBeInTheDocument();
  });

  it('keeps the reference form open with the typed notes when the update fails', async () => {
    serviceMocks.updateReferenceCheck.mockRejectedValue(new Error('boom'));
    const user = await openReview();

    await user.click(screen.getByRole('tab', { name: /references/i }));
    const panel = screen.getByRole('tabpanel');
    await user.click(within(panel).getByRole('button', { name: 'Update Status' }));
    await user.type(screen.getByLabelText('Notes'), 'Left a voicemail');
    await user.click(screen.getByRole('button', { name: 'Update Reference' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to update reference/i),
        expect.objectContaining({ action: expect.objectContaining({ label: 'Retry' }) })
      )
    );
    expect(screen.getByLabelText('Notes')).toHaveValue('Left a voicemail');
    expect(screen.getByRole('button', { name: 'Update Reference' })).toBeInTheDocument();
    expect(screen.queryByText('Error loading application')).not.toBeInTheDocument();
  });

  it('keeps the schedule-visit form and its text open when scheduling fails', async () => {
    serviceMocks.scheduleHomeVisit.mockRejectedValue(new Error('boom'));
    const user = await openReview();

    await user.click(screen.getByRole('tab', { name: /home visits/i }));
    await user.click(screen.getByRole('button', { name: 'Schedule Visit' }));
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2099-01-01' } });
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '10:00' } });
    await user.selectOptions(
      screen.getByRole('combobox', { name: /assigned staff/i }),
      'Sam Carer'
    );
    await user.type(screen.getByLabelText(/Visit Notes/), 'Bring ID');
    await user.click(
      screen.getAllByRole('button', { name: 'Schedule Visit' }).at(-1) as HTMLElement
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to schedule visit/i),
        expect.objectContaining({ action: expect.objectContaining({ label: 'Retry' }) })
      )
    );
    expect(screen.getByLabelText(/Visit Notes/)).toHaveValue('Bring ID');
    expect(screen.queryByText('Error loading application')).not.toBeInTheDocument();
  });
});
