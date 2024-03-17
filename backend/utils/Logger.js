// LoggerUtil.js
import winston from 'winston';
import morgan from 'morgan';

class LoggerUtil {
	constructor(serviceName = 'user-service') {
		this.logger = winston.createLogger({
			level: 'info',
			format: winston.format.combine(
				winston.format.timestamp({
					format: 'YYYY-MM-DD HH:mm:ss',
				}),
				winston.format.errors({ stack: true }),
				winston.format.splat(),
				winston.format.json()
			),
			defaultMeta: { service: serviceName },
			transports: [
				new winston.transports.File({
					filename: 'logs/error.log',
					level: 'error',
				}),
				new winston.transports.File({ filename: 'logs/combined.log' }),
			],
		});

		if (process.env.NODE_ENV !== 'production') {
			this.logger.add(
				new winston.transports.Console({
					format: winston.format.simple(),
				})
			);
		}
	}

	// Method to get the winston logger for custom logging
	getLogger() {
		return this.logger;
	}

	// Static method to setup morgan middleware for HTTP request logging
	static httpLogger() {
		return morgan('dev', {
			skip: (req, res) => process.env.NODE_ENV === 'test', // Skip logging for test environment
		});
	}
}

export default LoggerUtil;
