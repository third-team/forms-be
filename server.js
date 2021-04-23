const Koa = require('koa');
const koaBodyParser = require('koa-bodyparser');
const koaCors = require('@koa/cors');
require('dotenv').config();
const { router, protectedRouter } = require('./api/routes/routes');
const extractJWTPayload = require('./middleware/extractJWTPayload');
const connectMongoDB = require('./mongoDBConnect');

const PORT = process.env.PORT || 3000;

connectMongoDB();

const app = new Koa();

app.use(koaCors());

app.use(koaBodyParser());

app.use(router.routes()).use(router.allowedMethods());

app.use(extractJWTPayload);

app.use(protectedRouter.routes()).use(protectedRouter.allowedMethods());

app.listen(PORT, () => {
	console.log(`listening on 127.0.0.1:${PORT}...`);
});
