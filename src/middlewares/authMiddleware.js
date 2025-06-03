const jwt = require('jsonwebtoken');
require('dotenv').config();

const handleError = (res, statusCode, message) => {
	return res.status(statusCode).json({ error: message });
};

const authMiddleware = async (req, res, next) => {
	try {
		const authHeader = req.headers.authorization || req.header('Authorization');
		if (!authHeader?.startsWith('Bearer ')) {
			return handleError(res, 401, 'Access denied, no token provided');
		}
		const token = authHeader.split(' ')[1];
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = decoded;
		next();
	} catch (err) {
		if (err.name === 'JsonWebTokenError') {
			return handleError(res, 401, 'Invalid token');
		} else if (err.name === 'TokenExpiredError') {
			return handleError(res, 401, 'Token expired');
		}
		return handleError(res, 500, 'Internal server error');
	}
};

const roleMiddleware = (requiredRole) => {
	return (req, res, next) => {
		try {
			if (!req.user) {
				return handleError(res, 401, 'Unauthorized, user not authenticated');
			}
			if (req.user.role !== requiredRole) {
				return handleError(res, 403, 'Forbidden, insufficient privileges');
			}
			next();
		} catch (err) {
			return handleError(res, 500, 'Internal server error');
		}
	};
};

module.exports = {
	authMiddleware,
	roleMiddleware
};
