// Import the jsonwebtoken package for verifying JSON Web Tokens.
import jwt from 'jsonwebtoken';

/**
 * Middleware function to authenticate a token provided in the request cookies.
 *
 * This middleware attempts to verify the authenticity of a token sent in the request cookies.
 * If the token is valid, the request is allowed to proceed to the next middleware or route handler.
 * If the token is missing or invalid, it responds with an appropriate HTTP status code and error message.
 *
 * @param {Object} req - The request object, which contains data about the HTTP request.
 * @param {Object} res - The response object, used to send back the desired HTTP response.
 * @param {Function} next - A callback function that passes control to the next middleware function in the stack.
 */
const authenticateToken = (req, res, next) => {
	// Retrieve the token from the request cookies. It assumes the use of cookie-parser middleware to parse cookies.
	const token = req.cookies.token;

	// Check if the token is not provided in the request cookies.
	if (token == null) {
		// If not, return a 401 Unauthorized status code and an error message indicating no token was provided.
		return res.status(401).json({ error: 'No token provided' });
	}

	// Verify the token using the jsonwebtoken's verify method.
	// The token is verified against the secret key stored in the environment variables (process.env.SECRET_KEY).
	jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
		// If there's an error during verification (e.g., token is invalid or expired), log the error and return a 403 Forbidden status.
		if (err) {
			console.error('Token verification failed:', err);
			return res.status(403).json({ error: 'Invalid token' });
		}
		// If the token is valid, attach the decoded user information to the request object.
		// This makes the user information available to subsequent middleware functions or route handlers.
		req.user = user;
		// Call the next() function to pass control to the next middleware in the stack.
		next();
	});
};

// Export the middleware to make it available for import in other files.
export default authenticateToken;
