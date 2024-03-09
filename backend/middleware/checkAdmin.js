// middleware/checkAdmin.js
const checkAdmin = (req, res, next) => {
	if (!req.user.isAdmin) {
		return res.status(403).json({ message: 'Access denied. Not an admin.' });
	}
	next();
};

export default checkAdmin;
