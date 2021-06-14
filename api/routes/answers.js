const Form = require('../models/Form');
const Question = require('../models/Question');
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

	protectedRouter.post('/answers', async (ctx) => {
		const userId = ctx.request.tokenPayload.id;
		const { answer, isCorrect, questionId } = ctx.request.body;
		let { index } = ctx.request.body;

		// check if question belongs to form that belongs to user.
		const question = await Question.findById(questionId, 'formId').exec();
		if (!question) {
			ctx.status = 400;
			ctx.body = { message: 'Invalid POST body!' };
			return;
		}
		const { formId } = question;
		const userIsAuthor = await Form.exists({ _id: formId, authorId: userId });

		if (!userIsAuthor) {
			ctx.status = 403;
			ctx.body = { message: 'Forbidden!' };
			return;
		}

		if (!index) {
			const answers = await Answer.find({ questionId })
				.sort({ index: -1 })
				.limit(1)
				.exec();

			if (answers.length === 0) {
				index = 0;
			} else {
				const lastAnswer = answers[0];

				const maxIndex = lastAnswer.index;

				index = maxIndex + 1;
			}
		} else {
			const indexAlreadyTaken = await Answer.exists({ questionId, index });
			if (indexAlreadyTaken) {
				await Answer.updateMany(
					{ questionId, index: { $gte: index } },
					{ $inc: { index: 1 } }
				).exec();
			}
		}

		try {
			const createdAnswer = await Answer.create({
				answer,
				isCorrect,
				questionId,
				index,
			});

			ctx.status = 201;
			ctx.body = { message: 'ok', answerId: createdAnswer.id };
		} catch (err) {
			console.error(err.message);
			if (err.name === 'ValidationError') {
				ctx.status = 400;
				ctx.body = { message: 'Invalid POST body!' };
				return;
			}
			respondeWith500(ctx);
		}
	});
};
