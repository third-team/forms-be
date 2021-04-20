const Koa = require('koa');
const koaBodyParser = require('koa-bodyparser');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

const app = new Koa();

app.use(koaBodyParser());

app.use((ctx) => {
	ctx.body = { message: 'Hello from Koa.js' };
});

app.listen(PORT, () => {
	console.log(`listening on 127.0.0.1:${PORT}...`);
});
