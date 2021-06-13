const Answer = require('../models/Answer');
const { getQuery, respondeWith500 } = require('../utils/httpUtils');
const objectIdRegExpString = require('../utils/mongoDBObjectIdRegExp');

module.exports = function (router, protectedRouter) {
	const objectIdRegExp = new RegExp(objectIdRegExpString);

	router.get('/answers', async (ctx) => {
		const query = getQuery(ctx.request.url);

		const filter = {};
		if (query.questionId) {
			if (!objectIdRegExp.test(query.questionId)) {
				ctx.status = 400;
				ctx.body = { message: 'Invalid parameter: questionId!' };
				return;
			}
			filter.questionId = query.questionId;
		}

		try {
			const answers = await Answer.find(filter).exec();

			ctx.status = 200;
			ctx.body = { answers };
		} catch (err) {
			console.error(err.message);
			respondeWith500(ctx);
		}
	});

	router.get('/answers/:id', async (ctx) => {
		const answerId = ctx.params.id;

		if (!objectIdRegExp.test(answerId)) {
			ctx.status = 400;
			ctx.body = { message: 'Invalid parameter: id' };
			return;
		}

		try {
			const answer = await Answer.findById(answerId).exec();

			ctx.status = 200;
			ctx.body = { answer };
		} catch (err) {
			console.error(err.message);
			respondeWith500(ctx);
		}
	});
};
