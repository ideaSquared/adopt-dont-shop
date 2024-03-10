import crypto from 'crypto';

// utils/tokenGenerator.js
export const generateResetToken = () => {
	return new Promise((resolve, reject) => {
		crypto.randomBytes(32, (err, buffer) => {
			if (err) {
				reject(err);
			} else {
				resolve(buffer.toString('hex'));
			}
		});
	});
};
