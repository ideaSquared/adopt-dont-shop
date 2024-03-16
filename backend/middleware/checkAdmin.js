/**
 * Middleware function to check if the authenticated user has admin privileges.
 *
 * This middleware is used to restrict access to certain functionalities or routes to only users with admin privileges.
 * It checks a property (isAdmin) on the user object attached to the request (usually by a previous authentication middleware)
 * to determine if the user has admin rights. If the user is not an admin, it responds with a 403 Forbidden status code
 * and a message indicating the access is denied. If the user is an admin, the request is allowed to proceed to the next
 * middleware or route handler.
 *
 * @param {Object} req - The request object, which contains data about the HTTP request, including user information.
 * @param {Object} res - The response object, used to send back the desired HTTP response.
 * @param {Function} next - A callback function that passes control to the next middleware function in the stack.
 */
const checkAdmin = (req, res, next) => {
	// Check if the isAdmin property on the user object is false or not set.
	if (!req.user.isAdmin) {
		// If the user is not an admin, return a 403 Forbidden status code and an error message.
		return res.status(403).json({ message: 'Access denied. Not an admin.' });
	}
	// If the user is an admin, call the next() function to pass control to the next middleware in the stack.
	next();
};

// Export the middleware to make it available for import in other files.
export default checkAdmin;
