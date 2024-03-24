import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import checkAdmin from '../middleware/checkAdmin.js';
import Sentry from '@sentry/node'; // Error tracking utility.
import LoggerUtil from '../utils/Logger.js'; // Logging utility.
import authenticateToken from '../middleware/authenticateToken.js';
const logger = new LoggerUtil('conversation-service').getLogger();

const router = express.Router();

// Since __dirname is not available in ES module scope, we define it manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility function to read log files
const readLogFiles = async (filePath) => {
	try {
		const data = await fs.promises.readFile(filePath, 'utf8');
		// Split the file content by new line and filter out any empty lines
		const lines = data.split('\n').filter((line) => line);
		// Parse each line from JSON string to JavaScript object
		return lines.map((line) => JSON.parse(line));
	} catch (error) {
		console.error('Error reading log file:', error);
		throw error; // Rethrow the error to handle it in the endpoint
	}
};

// Endpoint to get log entries
router.get('/', authenticateToken, checkAdmin, async (req, res) => {
	const logsDirectory = path.join(__dirname, '..', 'logs');
	const logFileName = 'combined.log'; // Specify your log file name
	const logFilePath = path.join(logsDirectory, logFileName);

	try {
		const logs = await readLogFiles(logFilePath);
		logger.info('Logs read');
		res.json(logs); // Send the parsed logs as JSON
	} catch (error) {
		logger.error('Failed to read logs');
		Sentry.captureException(error);
		res.status(500).send('Failed to read logs');
	}
});

export default router;
