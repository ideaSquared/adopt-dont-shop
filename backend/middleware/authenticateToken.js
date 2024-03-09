// middleware/authenticateToken.js
import jwt from 'jsonwebtoken';

const authenticateToken = (req, res, next) => {
	const token = req.cookies.token; // Assuming cookie-parser middleware is used

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

export default authenticateToken;
