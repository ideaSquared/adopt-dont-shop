// middleware/authenticateToken.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
	// Assuming the cookie-parser middleware is used to parse cookies into req.cookies
	const token = req.cookies.token; // Access the token directly from req.cookies

	if (token == null) {
		return res.status(401).json({ error: 'No token provided' });
	}

	jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
		if (err) {
			console.error('Token verification failed:', err);
			return res.status(403).json({ error: 'Invalid token' });
		}
		req.user = user;
		next();
	});
};

module.exports = authenticateToken;
