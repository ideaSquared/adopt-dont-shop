import express from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticateToken, requireRole } from '../middleware/auth';
import { authLimiter, generalLimiter } from '../middleware/rate-limiter';

const router = express.Router();

// Apply authentication to all chat routes
router.use(authenticateToken);

// Chat management routes

/**
 * @swagger
 * /api/v1/:
 *   post:
 *     tags: [Messaging]
 *     summary: POST /api/v1/
 *     description: Handle POST request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/ successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/ successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/:
 *   post:
 *     tags: [Messaging]
 *     summary: POST /api/v1/
 *     description: Handle POST request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/ successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/ successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/:
 *   post:
 *     tags: [Messaging]
 *     summary: POST /api/v1/
 *     description: Handle POST request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/ successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/ successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/:
 *   post:
 *     tags: [Messaging]
 *     summary: POST /api/v1/
 *     description: Handle POST request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/ successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/ successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/', authLimiter, ChatController.createChat);


/**
 * @swagger
 * /api/v1/:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/
 *     description: Handle GET request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/ successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/
 *     description: Handle GET request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/ successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/
 *     description: Handle GET request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/ successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/
 *     description: Handle GET request for /api/v1/
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/ successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/', generalLimiter, ChatController.getChats);


/**
 * @swagger
 * /api/v1/search:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/search
 *     description: Handle GET request for /api/v1/search
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/search successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/search:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/search
 *     description: Handle GET request for /api/v1/search
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/search successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/search:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/search
 *     description: Handle GET request for /api/v1/search
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/search successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/search:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/search
 *     description: Handle GET request for /api/v1/search
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/search successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/search', generalLimiter, ChatController.searchConversations);


/**
 * @swagger
 * /api/v1/{chatId}:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/{chatId}
 *     description: Handle GET request for /api/v1/{chatId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{chatId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/{chatId}
 *     description: Handle GET request for /api/v1/{chatId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{chatId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/{chatId}
 *     description: Handle GET request for /api/v1/{chatId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{chatId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/{chatId}
 *     description: Handle GET request for /api/v1/{chatId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{chatId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:chatId', generalLimiter, ChatController.getChatById);


/**
 * @swagger
 * /api/v1/{chatId}:
 *   patch:
 *     tags: [Messaging]
 *     summary: PATCH /api/v1/{chatId}
 *     description: Handle PATCH request for /api/v1/{chatId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       200:
 *         description: PATCH /api/v1/{chatId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "PATCH /api/v1/{chatId} successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}:
 *   patch:
 *     tags: [Messaging]
 *     summary: PATCH /api/v1/{chatId}
 *     description: Handle PATCH request for /api/v1/{chatId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       200:
 *         description: PATCH /api/v1/{chatId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "PATCH /api/v1/{chatId} successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}:
 *   patch:
 *     tags: [Messaging]
 *     summary: PATCH /api/v1/{chatId}
 *     description: Handle PATCH request for /api/v1/{chatId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       200:
 *         description: PATCH /api/v1/{chatId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "PATCH /api/v1/{chatId} successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}:
 *   patch:
 *     tags: [Messaging]
 *     summary: PATCH /api/v1/{chatId}
 *     description: Handle PATCH request for /api/v1/{chatId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       200:
 *         description: PATCH /api/v1/{chatId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "PATCH /api/v1/{chatId} successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.patch('/:chatId', authLimiter, ChatController.updateChat);


/**
 * @swagger
 * /api/v1/{chatId}:
 *   delete:
 *     tags: [Messaging]
 *     summary: DELETE /api/v1/{chatId}
 *     description: Handle DELETE request for /api/v1/{chatId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: DELETE /api/v1/{chatId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "DELETE /api/v1/{chatId} successful"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}:
 *   delete:
 *     tags: [Messaging]
 *     summary: DELETE /api/v1/{chatId}
 *     description: Handle DELETE request for /api/v1/{chatId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: DELETE /api/v1/{chatId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "DELETE /api/v1/{chatId} successful"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}:
 *   delete:
 *     tags: [Messaging]
 *     summary: DELETE /api/v1/{chatId}
 *     description: Handle DELETE request for /api/v1/{chatId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: DELETE /api/v1/{chatId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "DELETE /api/v1/{chatId} successful"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}:
 *   delete:
 *     tags: [Messaging]
 *     summary: DELETE /api/v1/{chatId}
 *     description: Handle DELETE request for /api/v1/{chatId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: DELETE /api/v1/{chatId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "DELETE /api/v1/{chatId} successful"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:chatId', authLimiter, ChatController.deleteChat);

// Message routes

/**
 * @swagger
 * /api/v1/{chatId}/messages:
 *   post:
 *     tags: [Messaging]
 *     summary: POST /api/v1/{chatId}/messages
 *     description: Handle POST request for /api/v1/{chatId}/messages
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/{chatId}/messages successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/{chatId}/messages successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/{chatId}/messages:
 *   post:
 *     tags: [Messaging]
 *     summary: POST /api/v1/{chatId}/messages
 *     description: Handle POST request for /api/v1/{chatId}/messages
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/{chatId}/messages successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/{chatId}/messages successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/{chatId}/messages:
 *   post:
 *     tags: [Messaging]
 *     summary: POST /api/v1/{chatId}/messages
 *     description: Handle POST request for /api/v1/{chatId}/messages
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/{chatId}/messages successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/{chatId}/messages successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/{chatId}/messages:
 *   post:
 *     tags: [Messaging]
 *     summary: POST /api/v1/{chatId}/messages
 *     description: Handle POST request for /api/v1/{chatId}/messages
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/{chatId}/messages successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/{chatId}/messages successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/:chatId/messages', authLimiter, ChatController.sendMessage);


/**
 * @swagger
 * /api/v1/{chatId}/messages:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/{chatId}/messages
 *     description: Handle GET request for /api/v1/{chatId}/messages
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{chatId}/messages successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}/messages:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/{chatId}/messages
 *     description: Handle GET request for /api/v1/{chatId}/messages
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{chatId}/messages successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}/messages:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/{chatId}/messages
 *     description: Handle GET request for /api/v1/{chatId}/messages
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{chatId}/messages successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}/messages:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/{chatId}/messages
 *     description: Handle GET request for /api/v1/{chatId}/messages
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{chatId}/messages successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:chatId/messages', generalLimiter, ChatController.getMessages);


/**
 * @swagger
 * /api/v1/{chatId}/read:
 *   patch:
 *     tags: [Messaging]
 *     summary: PATCH /api/v1/{chatId}/read
 *     description: Handle PATCH request for /api/v1/{chatId}/read
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       200:
 *         description: PATCH /api/v1/{chatId}/read successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "PATCH /api/v1/{chatId}/read successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}/read:
 *   patch:
 *     tags: [Messaging]
 *     summary: PATCH /api/v1/{chatId}/read
 *     description: Handle PATCH request for /api/v1/{chatId}/read
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       200:
 *         description: PATCH /api/v1/{chatId}/read successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "PATCH /api/v1/{chatId}/read successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}/read:
 *   patch:
 *     tags: [Messaging]
 *     summary: PATCH /api/v1/{chatId}/read
 *     description: Handle PATCH request for /api/v1/{chatId}/read
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       200:
 *         description: PATCH /api/v1/{chatId}/read successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "PATCH /api/v1/{chatId}/read successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}/read:
 *   patch:
 *     tags: [Messaging]
 *     summary: PATCH /api/v1/{chatId}/read
 *     description: Handle PATCH request for /api/v1/{chatId}/read
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       200:
 *         description: PATCH /api/v1/{chatId}/read successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "PATCH /api/v1/{chatId}/read successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.patch('/:chatId/read', generalLimiter, ChatController.markAsRead);


/**
 * @swagger
 * /api/v1/{chatId}/unread-count:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/{chatId}/unread-count
 *     description: Handle GET request for /api/v1/{chatId}/unread-count
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{chatId}/unread-count successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}/unread-count:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/{chatId}/unread-count
 *     description: Handle GET request for /api/v1/{chatId}/unread-count
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{chatId}/unread-count successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}/unread-count:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/{chatId}/unread-count
 *     description: Handle GET request for /api/v1/{chatId}/unread-count
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{chatId}/unread-count successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}/unread-count:
 *   get:
 *     tags: [Messaging]
 *     summary: GET /api/v1/{chatId}/unread-count
 *     description: Handle GET request for /api/v1/{chatId}/unread-count
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GET /api/v1/{chatId}/unread-count successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:chatId/unread-count', generalLimiter, ChatController.getUnreadCount);

// Participant management routes

/**
 * @swagger
 * /api/v1/{chatId}/participants:
 *   post:
 *     tags: [Messaging]
 *     summary: POST /api/v1/{chatId}/participants
 *     description: Handle POST request for /api/v1/{chatId}/participants
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/{chatId}/participants successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/{chatId}/participants successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/{chatId}/participants:
 *   post:
 *     tags: [Messaging]
 *     summary: POST /api/v1/{chatId}/participants
 *     description: Handle POST request for /api/v1/{chatId}/participants
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/{chatId}/participants successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/{chatId}/participants successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/{chatId}/participants:
 *   post:
 *     tags: [Messaging]
 *     summary: POST /api/v1/{chatId}/participants
 *     description: Handle POST request for /api/v1/{chatId}/participants
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/{chatId}/participants successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/{chatId}/participants successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/{chatId}/participants:
 *   post:
 *     tags: [Messaging]
 *     summary: POST /api/v1/{chatId}/participants
 *     description: Handle POST request for /api/v1/{chatId}/participants
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/{chatId}/participants successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/{chatId}/participants successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/:chatId/participants', authLimiter, ChatController.addParticipant);


/**
 * @swagger
 * /api/v1/{chatId}/participants/{userId}:
 *   delete:
 *     tags: [Messaging]
 *     summary: DELETE /api/v1/{chatId}/participants/{userId}
 *     description: Handle DELETE request for /api/v1/{chatId}/participants/{userId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: DELETE /api/v1/{chatId}/participants/{userId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "DELETE /api/v1/{chatId}/participants/{userId} successful"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}/participants/{userId}:
 *   delete:
 *     tags: [Messaging]
 *     summary: DELETE /api/v1/{chatId}/participants/{userId}
 *     description: Handle DELETE request for /api/v1/{chatId}/participants/{userId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: DELETE /api/v1/{chatId}/participants/{userId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "DELETE /api/v1/{chatId}/participants/{userId} successful"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}/participants/{userId}:
 *   delete:
 *     tags: [Messaging]
 *     summary: DELETE /api/v1/{chatId}/participants/{userId}
 *     description: Handle DELETE request for /api/v1/{chatId}/participants/{userId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: DELETE /api/v1/{chatId}/participants/{userId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "DELETE /api/v1/{chatId}/participants/{userId} successful"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/{chatId}/participants/{userId}:
 *   delete:
 *     tags: [Messaging]
 *     summary: DELETE /api/v1/{chatId}/participants/{userId}
 *     description: Handle DELETE request for /api/v1/{chatId}/participants/{userId}
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: DELETE /api/v1/{chatId}/participants/{userId} successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "DELETE /api/v1/{chatId}/participants/{userId} successful"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:chatId/participants/:userId', authLimiter, ChatController.removeParticipant);

// Message reaction routes

/**
 * @swagger
 * /api/v1/messages/{messageId}/reactions:
 *   post:
 *     tags: [Messaging]
 *     summary: POST /api/v1/messages/{messageId}/reactions
 *     description: Handle POST request for /api/v1/messages/{messageId}/reactions
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/messages/{messageId}/reactions successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/messages/{messageId}/reactions successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/messages/{messageId}/reactions:
 *   post:
 *     tags: [Messaging]
 *     summary: POST /api/v1/messages/{messageId}/reactions
 *     description: Handle POST request for /api/v1/messages/{messageId}/reactions
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/messages/{messageId}/reactions successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/messages/{messageId}/reactions successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/messages/{messageId}/reactions:
 *   post:
 *     tags: [Messaging]
 *     summary: POST /api/v1/messages/{messageId}/reactions
 *     description: Handle POST request for /api/v1/messages/{messageId}/reactions
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/messages/{messageId}/reactions successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/messages/{messageId}/reactions successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/messages/{messageId}/reactions:
 *   post:
 *     tags: [Messaging]
 *     summary: POST /api/v1/messages/{messageId}/reactions
 *     description: Handle POST request for /api/v1/messages/{messageId}/reactions
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Add properties here
 *     responses:
 *       201:
 *         description: POST /api/v1/messages/{messageId}/reactions successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "POST /api/v1/messages/{messageId}/reactions successful"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/messages/:messageId/reactions', generalLimiter, ChatController.addReaction);


/**
 * @swagger
 * /api/v1/messages/{messageId}/reactions:
 *   delete:
 *     tags: [Messaging]
 *     summary: DELETE /api/v1/messages/{messageId}/reactions
 *     description: Handle DELETE request for /api/v1/messages/{messageId}/reactions
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: DELETE /api/v1/messages/{messageId}/reactions successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "DELETE /api/v1/messages/{messageId}/reactions successful"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/messages/{messageId}/reactions:
 *   delete:
 *     tags: [Messaging]
 *     summary: DELETE /api/v1/messages/{messageId}/reactions
 *     description: Handle DELETE request for /api/v1/messages/{messageId}/reactions
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: DELETE /api/v1/messages/{messageId}/reactions successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "DELETE /api/v1/messages/{messageId}/reactions successful"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/messages/{messageId}/reactions:
 *   delete:
 *     tags: [Messaging]
 *     summary: DELETE /api/v1/messages/{messageId}/reactions
 *     description: Handle DELETE request for /api/v1/messages/{messageId}/reactions
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: DELETE /api/v1/messages/{messageId}/reactions successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "DELETE /api/v1/messages/{messageId}/reactions successful"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/messages/{messageId}/reactions:
 *   delete:
 *     tags: [Messaging]
 *     summary: DELETE /api/v1/messages/{messageId}/reactions
 *     description: Handle DELETE request for /api/v1/messages/{messageId}/reactions
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: DELETE /api/v1/messages/{messageId}/reactions successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "DELETE /api/v1/messages/{messageId}/reactions successful"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/messages/:messageId/reactions', generalLimiter, ChatController.removeReaction);

// Analytics routes (rescue organizations only)
router.get(
  '/analytics/overview',
  requireRole(['RESCUE_STAFF', 'RESCUE_ADMIN']),
  generalLimiter,
  ChatController.getChatAnalytics
);

export default router;
