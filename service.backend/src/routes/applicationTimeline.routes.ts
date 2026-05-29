import express from 'express';
import { body } from 'express-validator';
import ApplicationTimelineController from '../controllers/applicationTimeline.controller';
import { handleValidationErrors } from '../middleware/validation';
import { TimelineEventType } from '../models/ApplicationTimeline';

const router = express.Router();

const createManualEventValidation = [
  body('event_type').isIn(Object.values(TimelineEventType)).withMessage('Invalid event_type'),
  body('title').isString().trim().notEmpty().withMessage('title is required'),
  body('description').optional().isString(),
  body('metadata').optional().isObject(),
];

const addNoteValidation = [
  body('content').isString().trim().notEmpty().withMessage('content is required'),
  body('note_type')
    .optional()
    .isIn(['general', 'interview', 'home_visit', 'reference'])
    .withMessage('Invalid note_type'),
];

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
router.post(
  '/:application_id/timeline/events',
  createManualEventValidation,
  handleValidationErrors,
  ApplicationTimelineController.createManualEvent
);

/**
 * @route POST /api/applications/:application_id/timeline/notes
 * @desc Add a note to the application timeline
 * @access Private
 */
router.post(
  '/:application_id/timeline/notes',
  addNoteValidation,
  handleValidationErrors,
  ApplicationTimelineController.addNote
);

/**
 * @route POST /api/applications/timeline/bulk-stats
 * @desc Get bulk timeline statistics for multiple applications
 * @access Private
 */
router.post('/timeline/bulk-stats', ApplicationTimelineController.getBulkTimelineStats);

export default router;
