/* eslint-disable object-curly-newline */
const mongoose = require('mongoose');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const objectIdRegExp = require('../utils/mongoDBObjectIdRegExp');
const Form = require('../models/Form');
const { getQuery } = require('../utils/httpUtils');

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
			const question = await Question.findOne({ _id: questionId })
				.populate('answers')
				.exec();

			if (!question) {
				ctx.status = 404;
				ctx.body = { message: 'Question not found!' };
			} else {
				ctx.status = 200;
				ctx.body = { question: question.toJSON({ virtuals: true }) };
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

				await Answer.create(
					answers.map((answer) => ({
						...answer,
						questionId: createdQuestion.id,
					})),
					{ session }
				);
			});

			ctx.status = 201;
			ctx.body = { message: 'ok', index };
		} catch (err) {
			console.error(err.message);
			if (err.name === 'ValidationError') {
				ctx.status = 400;
				ctx.body = { message: 'Invalid POST body!' };
			} else {
				ctx.status = 500;
				ctx.body = { message: 'Internal server error!' };
			}
		} finally {
			if (session) session.endSession();
		}
	});

	protectedRouter.put(`/questions/:id${objectIdRegExp}`, async (ctx) => {
		const questionId = ctx.params.id;
		const { formId, question, answerType, index, answers } = ctx.request.body;

		/*
			Transactions can only be used on replica sets, otherwise there will be
			and error: 'This MongoDB deployment does not support retryable writes.
			Please add retryWrites=false to your connection string.' error.
		*/
		let session = null;
		let nModified = 0;
		try {
			session = await mongoose.startSession();
			await session.withTransaction(async () => {
				const result = await Question.updateOne(
					{ _id: questionId },
					{ $set: { formId, question, answerType, index } },
					{ omitUndefined: true, session }
				);

				nModified = result.nModified;

				await Answer.create(
					answers.map((answer) => ({ ...answer, questionId })),
					{ session }
				);
			});

			ctx.status = 200;
			ctx.body = { updated: nModified === 1 };
		} catch (err) {
			console.error(err.message);
			if (err.name === 'ValidationError') {
				ctx.status = 400;
				ctx.body = { message: 'Invalid POST body!' };
			} else {
				ctx.status = 500;
				ctx.body = { message: 'Internal server error!' };
			}
		}
	});

	protectedRouter.delete(`/questions/:id${objectIdRegExp}`, async (ctx) => {
		const questionId = ctx.params.id;
		const userId = ctx.request.tokenPayload.id;

		try {
			const { formId } = await Question.findById(questionId, 'formId').exec();
			if (!formId) {
				ctx.status = 404;
				ctx.body = { message: 'Question not found!' };
				return;
			}
			const form = await Form.findById(formId).exec();

			if (!form) {
				// maybe delete all other questions
			}

			if (form) {
				if (form.authorId.toString() === userId) {
					const result = await Question.deleteOne({ _id: questionId }).exec();
					await Answer.deleteMany({ questionId }).exec();

					ctx.status = 200;
					ctx.body = { deleted: result.deletedCount === 1 };
				} else {
					ctx.status = 403;
					ctx.body = { message: 'Forbidden' };
				}
			}
		} catch (err) {
			console.error(err);
			ctx.status = 500;
			ctx.body = { message: 'Internal server error!' };
		}
	});
};
