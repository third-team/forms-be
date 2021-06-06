const Form = require('../models/Form');
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const User = require('../models/User');
const objectIdRegExp = require('../utils/mongoDBObjectIdRegExp');

/*
	I want to 'validate' models before actually inserting them, so I
	don't have all the required properties for now. I don't want to
	make required: false or add some dummy properties just for now.
	So, I will validate models by myself

	async function isFormValid({ authorId, name, questions }) {
		try {
			await Form.validate({ authorId, name });
			await Promise.all(questions.map((question) => Question.validate(question)));
			await Promise.all(
				questions
					.map((question) => question.answers)
					.flat(1)
					.map((answer) => Answer.validate(answer))
			);

			return true;
		} catch (err) {
			console.error('Form is invalid:', err.message);
			return false;
		}
	}
*/

function isFormValid({ authorId, name, questions }) {
	if (!authorId || !name || questions === undefined || questions === null) {
		return false;
	}

	for (let i = 0; i < questions.length; ++i) {
		const question = questions[i];
		if (!question.question || !question.answerType) {
			return false;
		}

		if (question.answers === undefined || question.answers === null) {
			return false;
		}

		for (let j = 0; j < question.answers.length; ++j) {
			const answer = question.answers[j];
			if (
				!answer.answer ||
				answer.isCorrect === undefined ||
				answer.isCorrect === null
			) {
				return false;
			}
		}
	}

	return true;
}

module.exports = function (router, protectedRouter) {
	router.get('/forms', async (ctx) => {
		try {
			const forms = await Form.find({}, '_id name').exec();

			ctx.status = 200;
			ctx.body = { forms };
		} catch (err) {
			console.error(err);
			ctx.status = 500;
			ctx.body = { message: 'Internal server error!' };
		}
	});

	protectedRouter.get('/forms/my', async (ctx) => {
		try {
			const userId = ctx.request.tokenPayload.id;

			if (!userId) {
				ctx.status = 401;
				ctx.body = { message: 'Unauthorized!' };
				return;
			}

			const user = await User.findById(userId);
			if (!user) {
				ctx.status = 401;
				ctx.body = { message: 'Not authorized!' };
				return;
			}

			const forms = await Form.find({ authorId: userId }, '_id name').exec();

			ctx.status = 200;
			ctx.body = { forms };
		} catch (err) {
			console.error(err);
			ctx.status = 500;
			ctx.body = { message: 'Internal server error!' };
		}
	});

	router.get(`/forms/:id${objectIdRegExp}`, async (ctx) => {
		const formId = ctx.params.id;

		try {
			const form = await Form.findById(formId);

			if (!form) {
				ctx.status = 404;
				ctx.body = { message: 'Form not found!' };
				return;
			}

			await form
				.populate({
					path: 'questions',
					populate: {
						path: 'answers',
						options: {
							sort: { index: 1 },
						},
					},
					options: {
						sort: { index: 1 },
					},
				})
				.execPopulate();

			if (!form) {
				ctx.status = 404;
				ctx.body = { message: 'No such form!' };
				return;
			}

			ctx.status = 200;
			ctx.body = {
				form: form.toJSON({ virtuals: true }),
			};
		} catch (err) {
			console.error(err.message);
			ctx.status = 500;
			ctx.body = { message: 'Internal server error!' };
		}
	});

	// should be refactored using transactions
	protectedRouter.post('/forms', async (ctx) => {
		const { name, questions } = ctx.request.body;

		const authorId = ctx.request.tokenPayload.id;
		const author = await User.exists({ _id: authorId });

		if (!author) {
			ctx.status = 403;
			ctx.body = { message: 'No such user!' };
			return;
		}

		// maybe it is better to do transactions
		if (!isFormValid({ authorId, name, questions })) {
			ctx.status = 400;
			ctx.body = { message: 'Invalid POST body!' };
			return;
		}

		try {
			const form = await Form.create({ authorId, name });

			const questionsCreationPromises = [];

			questions.forEach((question, questionIndex) => {
				questionsCreationPromises.push(
					Question.create({
						question: question.question,
						index: questionIndex,
						formId: form.id,
						answerType: question.answerType,
					})
				);
			});

			const dbQuestions = await Promise.all(questionsCreationPromises);

			dbQuestions.sort((a, b) => a.index - b.index);
			const answersCreationPromises = [];
			dbQuestions.forEach((question, questionIndex) => {
				questions[questionIndex].answers.forEach((answer, answerIndex) => {
					answersCreationPromises.push(
						Answer.create({
							...answer,
							questionId: question.id,
							index: answerIndex,
						})
					);
				});
			});

			// just to be sure that everything is ok
			await Promise.all(answersCreationPromises);

			ctx.status = 201;
			ctx.body = { message: 'ok', formId: form.id };
		} catch (err) {
			console.error(err.message);
			if (err.name === 'ValidationError') {
				ctx.status = 400;
				ctx.body = { message: 'Invalid POST body' };
			} else {
				ctx.status = 500;
				ctx.body = { message: 'Internal server error!' };
			}
		}
	});

	protectedRouter.put(`/forms/:id${objectIdRegExp}`, async (ctx) => {
		const _id = ctx.params.id;
		const { name } = ctx.request.body;
		const userId = ctx.request.tokenPayload.id;

		if (!userId) {
			ctx.status = 403;
			ctx.body = { message: 'Invalid token!' };
			return;
		}
		const user = await User.findById(userId);

		if (!user) {
			ctx.status = 403;
			ctx.body = { message: 'No such user!' };
			return;
		}

		if (!_id) {
			ctx.status = 400;
			ctx.body = { message: 'Invalid PUT body!' };
			return;
		}

		// maybe redundant
		const formExists = await Form.exists({ _id, authorId: userId });
		if (!formExists) {
			ctx.status = 404;
			ctx.body = { message: 'No such form!' };
			return;
		}

		const result = await Form.updateOne(
			{ _id },
			{ $set: { name } },
			{ omitUndefined: true }
		).exec();

		ctx.status = 200;
		ctx.body = { updated: Boolean(result.nModified) };
	});

	protectedRouter.delete(`/forms/:id${objectIdRegExp}`, async (ctx) => {
		const formId = ctx.params.id;
		const userId = ctx.request.tokenPayload.id;

		if (!userId) {
			ctx.status = 401;
			ctx.body = { message: 'Unauthorized!' };
			return;
		}

		try {
			const user = await User.findById(userId).exec();

			if (!user) {
				ctx.status = 401;
				ctx.body = { message: 'Unauthorized!' };
				return;
			}

			// maybe redundant
			const formExists = await Form.exists({ _id: formId, authorId: userId });
			if (!formExists) {
				ctx.status = 404;
				ctx.body = { message: 'Form not found!' };
				return;
			}

			const result = await Form.deleteOne({
				_id: formId,
				authorId: userId,
			}).exec();

			if (result.deletedCount === 1) {
				const formQuestions = await Question.find({ formId }).exec();
				const questionsDeletionPromises = [];
				formQuestions.forEach((question) => {
					questionsDeletionPromises.push(question.drop());
				});

				await Promise.all(questionsDeletionPromises);
			}

			ctx.status = 200;
			ctx.body = { deleted: result.deletedCount === 1 };
		} catch (err) {
			console.error(err);
			ctx.status = 500;
			ctx.body = { message: 'Internal server error!' };
		}
	});
};
