const KoaRouter = require('koa-router');

const router = new KoaRouter();
const protectedRouter = new KoaRouter();

router.get('/', (ctx, next) => {
	ctx.body = { message: 'Hello from Koa.js' };
	next();
});

module.exports = {
	router,
	protectedRouter,
};
