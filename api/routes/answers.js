/* eslint-disable object-curly-newline */
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const { /* getQuery, */ respondWith500 } = require('../utils/httpUtils');
// const objectIdRegExpString = require('../utils/mongoDBObjectIdRegExp');
const { doesQuestionBelongToUser } = require('../utils/dbUtils');

module.exports = function (router, protectedRouter) {
	// const objectIdRegExp = new RegExp(objectIdRegExpString);

	/*
		disable GET methods because they expose isCorrect

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
				respondWith500(ctx);
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
				respondWith500(ctx);
			}
		});
	*/

	// maybe should use transaction.
	protectedRouter.post('/answers', async (ctx) => {
		const userId = ctx.request.tokenPayload.id;
		const { answer, isCorrect, questionId } = ctx.request.body;
		let { index } = ctx.request.body;

		if (!(await doesQuestionBelongToUser(questionId, userId))) {
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
			respondWith500(ctx);
		}
	});

	// maybe should use transaction.
	protectedRouter.put('/answers/:id', async (ctx) => {
		const userId = ctx.request.tokenPayload.id;
		const answerId = ctx.params.id;
		const { answer, questionId, isCorrect, index } = ctx.request.body;

		try {
			const answerById = await Answer.findById(answerId, 'questionId').exec();
			if (!answerById) {
				ctx.status = 404;
				ctx.body = { message: 'Answer not found' };
				return;
			}
			if (!(await doesQuestionBelongToUser(answerById.questionId, userId))) {
				ctx.status = 403;
				ctx.body = { message: 'Forbidden!' };
				return;
			}

			/*
        If questionId is supplied, we should check whether question with id 'questionId'
        also belongs to this user.
      */
			if (questionId) {
				if (!(await doesQuestionBelongToUser(questionId, userId))) {
					ctx.status = 403;
					ctx.body = { message: 'Forbidden!' };
					return;
				}
			}

			const questionById = await Question.findById(
				answerById.questionId
			).exec();

			// set isCorrect to false for all the other answers
			if (isCorrect && questionById.answerType === 'radio') {
				await Answer.updateMany(
					{ questionId: answerById.questionId },
					{ $set: { isCorrect: false } }
				).exec();
			}

			// check whether the index is taken.
			if (index !== undefined && index !== null) {
				const indexAlreadyTaken = await Answer.exists({
					questionId: answerById.questionId,
					index,
				});
				if (indexAlreadyTaken) {
					console.log('taken');
					await Answer.updateMany(
						{ questionId: answerById.questionId, index: { $gte: index } },
						{ $inc: { index: 1 } }
					).exec();
				}
			}
			// =================================

			const result = await Answer.updateOne(
				{ _id: answerId },
				{ answer, questionId, isCorrect, index },
				{ omitUndefined: true }
			);

			ctx.status = 200;
			ctx.body = { updated: result.nModified === 1 };
		} catch (err) {
			console.error(err.message);
			if (err.name === 'ValidationError') {
				ctx.status = 400;
				ctx.body = { message: 'Invalid PUT body!' };
				return;
			}
			respondWith500(ctx);
		}
	});

	protectedRouter.delete('/answers/:id', async (ctx) => {
		const userId = ctx.request.tokenPayload.id;
		const answerId = ctx.params.id;

		try {
			const answer = await Answer.findById(answerId);
			if (!answer) {
				ctx.status = 404;
				ctx.body = { message: 'Answer not found!' };
				return;
			}

			if (!(await doesQuestionBelongToUser(answer.questionId, userId))) {
				ctx.status = 403;
				ctx.body = { message: 'Forbidden!' };
				return;
			}

			const result = await Answer.deleteOne({ _id: answerId }).exec();

			ctx.status = 200;
			ctx.body = { message: 'ok', deleted: result.deletedCount === 1 };
		} catch (err) {
			console.error(err.message);
			respondWith500(ctx);
		}
	});
};
