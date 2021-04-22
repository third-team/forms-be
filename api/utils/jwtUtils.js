const jwt = require('jsonwebtoken');

/*
	Just to asynchronise jwt operations
*/

function signToken(payload) {
	return new Promise((resolve, reject) => {
		jwt.sign(payload, process.env.JWT_SECRET_KEY, (err, token) => {
			if (err || !token) {
				reject(err);
				return;
			}

			resolve(token);
		});
	});
}

function verifyToken(token) {
	return new Promise((resolve, reject) => {
		jwt.verify(token, process.env.JWT_SECRET_KEY, (err, payload) => {
			if (err) {
				reject(err);
				return;
			}

			resolve(payload);
		});
	});
}

module.exports = {
	signToken,
	verifyToken,
};
