const { verifyToken } = require('../api/utils/jwtUtils');

function getJWTToken(ctx) {
	const authHeader = ctx.header.authorization;
	if (!authHeader) return null;
	const token = authHeader.split(' ')[1];
	return token || null;
}

async function extractJWTPayload(ctx, next) {
	const token = getJWTToken(ctx);

	if (token) {
		try {
			ctx.request.tokenPayload = (await verifyToken(token)).payload;
		} catch (err) {
			console.error('Error occured while verifying token:', err.message);
			ctx.status = 400;
			ctx.body = { message: 'Bad token!' };
			ctx.request.tokenPayload = null;
			return;
		}
	} else {
		ctx.status = 403;
		ctx.body = { message: 'Token not provided!' };
		return;
	}

	next();
}

module.exports = extractJWTPayload;
