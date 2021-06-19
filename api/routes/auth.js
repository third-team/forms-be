const { signToken } = require('../utils/jwtUtils');
const User = require('../models/User');

async function getToken(ctx, payload) {
	try {
		const token = await signToken(payload);
		ctx.status = 200;
		ctx.body = { token };
	} catch (err) {
		console.error('Error while signing token:', err.message);
		ctx.status = 500;
		ctx.body = { message: 'Internal server error!' };
	}
}

module.exports = function (router) {
	router.post('/register', async (ctx) => {
		const { email, password } = ctx.request.body;

		if (!email || !password) {
			ctx.status = 400;
			ctx.body = { message: 'No email or password provided' };
			return;
		}

		try {
			const userExists = await User.exists({ email });
			if (userExists) {
				ctx.status = 403;
				ctx.body = { message: 'Such user already exists!' };
				return;
			}
			const newUser = new User({ email, password });
			await newUser.save();
			await getToken(ctx, { id: newUser.id });
		} catch (err) {
			console.error(err);
			ctx.status = 500;
			ctx.body = { message: 'Internal server error!' };
		}
	});

	router.post('/login', async (ctx) => {
		const { email, password } = ctx.request.body;

		if (!email || !password) {
			ctx.status = 400;
			ctx.body = { message: 'No email or password provided' };
			return;
		}

		try {
			const user = await User.findOne({ email }).exec();

			if (!user) {
				ctx.status = 401;
				ctx.body = { message: 'No such user!' };
				return;
			}

			const isPasswordCorrect = await user.comparePassword(password);

			if (!isPasswordCorrect) {
				ctx.status = 401;
				ctx.body = { message: 'Wrong email and/or password!' };
				return;
			}

			await getToken(ctx, { id: user.id });
		} catch (err) {
			console.error(err);
			ctx.status = 500;
			ctx.body = { message: 'Internal server error!' };
		}
	});
};
