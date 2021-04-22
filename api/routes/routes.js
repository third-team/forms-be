const KoaRouter = require('koa-router');
const { signToken } = require('../utils/jwtUtils');

const router = new KoaRouter();
const protectedRouter = new KoaRouter();

// dummy users array until db is connected.
let users = [];

router.get('/', (ctx) => {
	ctx.body = { message: 'Hello from Koa.js' };
});

async function getToken(ctx, payload) {
	try {
		const token = await signToken({ payload });
		ctx.status = 200;
		ctx.body = { token };
	} catch (err) {
		console.error('Error while signing token:', err.message);
		ctx.status = 500;
		ctx.body = { message: 'Internal server error!' };
	}
}

router.post('/register', async (ctx) => {
	const { email, password } = ctx.request.body;

	if (!email || !password) {
		ctx.status = 400;
		ctx.body = { message: 'No email or password provided' };
		return;
	}

	const newUser = { id: Math.floor(Math.random() * 11234), email, password };

	users.push(newUser);

	await getToken(ctx, { id: newUser.id });
});

router.post('/login', async (ctx) => {
	const { email, password } = ctx.request.body;

	if (!email || !password) {
		ctx.status = 400;
		ctx.body = { message: 'No email or password provided' };
		return;
	}

	const user = users.find((u) => u.email === email && u.password === password);
	if (!user) {
		ctx.status = 401;
		ctx.body = { message: 'No such user!' };
		return;
	}

	await getToken(ctx, { id: user.id });
});

// dummy API
router.get('/users', (ctx) => {
	ctx.status = 200;
	ctx.body = { users };
});

router.delete('/users', (ctx) => {
	users = [];
	ctx.status = 200;
	ctx.body = { message: 'ok' };
});

protectedRouter.get('/protected', (ctx) => {
	const user = users.find((u) => u.id === +ctx.request.tokenPayload.id) || null;

	if (!user) {
		ctx.status = 403;
		ctx.body = { message: 'Invalid token!' };
		return;
	}

	ctx.body = {
		message: 'Hi from protected route.',
		payload: ctx.request.tokenPayload,
		user,
	};
});

module.exports = {
	router,
	protectedRouter,
};
