const mongoose = require('mongoose');
const queryString = require('querystring');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const objectIdRegExp = require('../utils/mongoDBObjectIdRegExp');

function getQuery(url) {
	const queryStartIndex = url.indexOf('?');
	if (queryStartIndex === -1) return {};
	return queryString.decode(url.substr(queryStartIndex + 1));
}

module.exports = function (router, protectedRouter) {
	router.get('/questions', async (ctx) => {
		const query = getQuery(ctx.request.url);

		const filter = {};
		if (query.formId) {
			filter.formId = query.formId;
		}

		try {
			const questions = await Question.find(filter)
				.populate('answers')
				.sort({ index: 1 })
				.exec();

			ctx.status = 200;
			ctx.body = {
				questions: questions.map((question) =>
					question.toJSON({ virtuals: true })
				),
			};
		} catch (err) {
			console.error(err.message);
			ctx.status = 500;
			ctx.body = { message: 'Invalid server error!' };
		}
	});

	router.get(`/questions/:id${objectIdRegExp}`, async (ctx) => {
		const questionId = ctx.params.id;

		try {
			const question = await Question.findOne({ _id: questionId }).exec();

			if (!question) {
				ctx.status = 404;
				ctx.body = { message: 'Question not found!' };
			} else {
				ctx.status = 200;
				ctx.body = { question };
			}
		} catch (err) {
			console.error(err.message);
			ctx.status = 500;
			ctx.body = { message: 'Internal server error!' };
		}
	});

	protectedRouter.post('/questions', async (ctx) => {
		const { formId, question, answerType, answers } = ctx.request.body;
		let { index } = ctx.request.body;

		let session = null;
		try {
			if (index === undefined) {
				const questions = await Question.find({ formId })
					.sort({ index: -1 })
					.limit(1)
					.exec();

				if (questions.length === 0) {
					index = 0;
				} else {
					const lastQuestion = questions[0];

					const maxIndex = lastQuestion.index;

					index = maxIndex + 1;
				}
			} else {
				const indexAlreadyTaken = await Question.exists({ formId, index });
				if (indexAlreadyTaken) {
					await Question.updateMany(
						{ formId, index: { $gte: index } },
						{ $inc: { index: 1 } }
					).exec();
				}
			}

			session = await mongoose.startSession();
			await session.withTransaction(async () => {
				const createdQuestion = await Question.create(
					[
						{
							formId,
							question,
							answerType,
							index,
						},
					],
					{ session }
				);

				if (!(answers instanceof Array)) {
					return;
				}

				const answersCreationPromises = [];
				answers.forEach((answer) => {
					answersCreationPromises.push(
						Answer.create([{ ...answer, questionId: createdQuestion.id }], {
							session,
						})
					);
				});

				await Promise.all(answersCreationPromises);
			});

			ctx.status = 201;
			ctx.body = { message: 'ok', index };
		} catch (err) {
			console.error(err.message);
			if (err.name === 'ValidationError') {
				ctx.status = 400;
				ctx.body = { message: 'Invalid POST body!', error: err.message };
			} else {
				ctx.status = 500;
				ctx.body = { message: 'Internal server error!' };
			}
		} finally {
			if (session) session.endSession();
		}
	});

	protectedRouter.put(`/questions/:id${objectIdRegExp}`, (ctx) => {});

	protectedRouter.delete(`/questions/:id${objectIdRegExp}`, (ctx) => {});
};
