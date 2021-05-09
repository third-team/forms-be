const Koa = require('koa');
const koaBodyParser = require('koa-bodyparser');
const koaCors = require('@koa/cors');
const { router, protectedRouter } = require('./api/routes/routes');
const extractJWTPayload = require('./middleware/extractJWTPayload');

const app = new Koa();

app.use(koaCors());

app.use(koaBodyParser());

app.use(router.routes()).use(router.allowedMethods());

app.use(extractJWTPayload);

app.use(protectedRouter.routes()).use(protectedRouter.allowedMethods());

module.exports = app;
