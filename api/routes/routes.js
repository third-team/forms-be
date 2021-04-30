const KoaRouter = require('koa-router');
const User = require('../models/User');
const createAuthRoutes = require('./auth');
const createFormRoutes = require('./forms');

const router = new KoaRouter();
const protectedRouter = new KoaRouter();

router.get('/', (ctx) => {
	ctx.body = { message: 'Hello from Koa.js' };
});

createAuthRoutes(router);
createFormRoutes(router, protectedRouter);

// dummy API
router.get('/users', async (ctx) => {
	try {
		const users = await User.find().exec();
		ctx.status = 200;
		ctx.body = { users };
	} catch (err) {
		console.error(err);
		ctx.status = 500;
		ctx.body = { message: 'Internal server error!' };
	}
});

router.delete('/users', (ctx) => {
	User.deleteMany().exec();
	ctx.status = 200;
	ctx.body = { message: 'ok' };
});

protectedRouter.get('/protected', async (ctx) => {
	try {
		const user = await User.findById(ctx.request.tokenPayload.id).exec();
		if (!user) {
			ctx.status = 403;
			ctx.body = { message: 'Invalid token!' };
			return;
		}

		ctx.status = 200;
		ctx.body = {
			message: 'Hi from protected route.',
			payload: ctx.request.tokenPayload,
			user,
		};
	} catch (err) {
		console.error(err.message);
		ctx.status = 500;
		ctx.body = { message: 'Internal server error!' };
	}
});

module.exports = {
	router,
	protectedRouter,
};
