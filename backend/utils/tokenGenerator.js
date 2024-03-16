import crypto from 'crypto';

/**
 * Asynchronously generates a secure, random token using Node.js's crypto module.
 *
 * This function is designed to produce a cryptographically secure token that can be used in various security contexts,
 * such as generating a token for resetting a user's password. It leverages the `crypto.randomBytes` method to generate
 * a sequence of random bytes, which are then converted to a hexadecimal string representation. The use of a promise
 * ensures that the function can be easily integrated into asynchronous workflows, allowing for the token generation
 * process to be awaited or used within a promise chain.
 *
 * @returns {Promise<string>} A promise that resolves to a string containing the generated token in hexadecimal format.
 * The promise will reject if an error occurs during the generation process, passing the error to the caller for
 * appropriate handling.
 *
 * The generated token is 32 bytes long, providing a high degree of randomness and making it suitable for secure
 * applications such as password reset links, session identifiers, or any scenario requiring random tokens.
 * The hexadecimal representation ensures the token is easily transmitted and stored in various backends or
 * transmitted over the network in a URL-safe format.
 *
 * Example usage:
 * ```
 * generateResetToken()
 *   .then(token => {
 *     console.log(`Generated token: ${token}`);
 *   })
 *   .catch(err => {
 *     console.error('Error generating token:', err);
 *   });
 * ```
 *
 * This utility function is a crucial component in implementing secure password reset features, enabling developers
 * to generate tokens that are secure against predictability and collision attacks.
 */

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
