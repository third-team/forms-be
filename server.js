const Koa = require('koa');
const koaBodyParser = require('koa-bodyparser');
const koaCors = require('@koa/cors');
require('dotenv').config();
const { router } = require('./api/routes/routes');

const PORT = process.env.PORT || 3000;

const app = new Koa();

app.use(koaCors());

app.use(koaBodyParser());

app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT, () => {
	console.log(`listening on 127.0.0.1:${PORT}...`);
});
