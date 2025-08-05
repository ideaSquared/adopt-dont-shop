import express from 'express';
import ApplicationTimelineController from '../controllers/applicationTimeline.controller';

const router = express.Router();

/**
 * @route GET /api/applications/:application_id/timeline
 * @desc Get timeline events for an application
 * @access Private
 */
router.get('/:application_id/timeline', ApplicationTimelineController.getApplicationTimeline);

/**
 * @route GET /api/applications/:application_id/timeline/stats
 * @desc Get timeline statistics for an application
 * @access Private
 */
router.get('/:application_id/timeline/stats', ApplicationTimelineController.getTimelineStats);

/**
 * @route POST /api/applications/:application_id/timeline/events
 * @desc Create a manual timeline event
 * @access Private
 */
router.post('/:application_id/timeline/events', ApplicationTimelineController.createManualEvent);

/**
 * @route POST /api/applications/:application_id/timeline/notes
 * @desc Add a note to the application timeline
 * @access Private
 */
router.post('/:application_id/timeline/notes', ApplicationTimelineController.addNote);

/**
 * @route POST /api/applications/timeline/bulk-stats
 * @desc Get bulk timeline statistics for multiple applications
 * @access Private
 */
router.post('/timeline/bulk-stats', ApplicationTimelineController.getBulkTimelineStats);

export default router;
