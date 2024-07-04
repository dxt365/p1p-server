const auth = function (req, res, next) {
	// if (req?.user && req?.session?.isAdmin) return next();
	// else
	// 	debug('error', 'Unauthorized access ' + req.user);
	// return res.status(401).json({
	// 	status: 'error',
	// 	data: {},
	// 	message: 'Unauthorized access'
	// });
    next()
};

module.exports = auth