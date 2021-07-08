/* eslint-disable no-undef */
const mongoose = require('mongoose');
const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');
const { connectDB, disconnectDB } = require('../mongoDBConnect');
const Form = require('../api/models/Form');
const Question = require('../api/models/Question');
const Answer = require('../api/models/Answer');
const User = require('../api/models/User');
const { signToken } = require('../api/utils/jwtUtils');
require('dotenv').config();

process.env.testing = true;

// It looks like mocha is running all test files in parallel
// so it tries to run a server for each file on the same PORT.
const server = app.listen(++process.env.PORT);

chai.should();
chai.use(chaiHttp);

let user = null;
let jwtToken = null;
const mainFormQuestions = [
	{
		question: 'test question 1',
		answerType: 'radio',
		answers: [
			{
				answer: 'test 1',
				isCorrect: true,
			},
		],
	},
	{
		question: 'test question 2',
		answerType: 'checkbox',
		answers: [
			{
				answer: 'test 2',
				isCorrect: false,
			},
		],
	},
];

const mainForm = { name: 'test form', questions: mainFormQuestions };

async function clearCollections() {
	console.log('clearing collections...');
	await Promise.all([
		User.deleteMany({}).exec(),
		Form.deleteMany({}).exec(),
		Question.deleteMany({}).exec(),
		Answer.deleteMany({}).exec(),
	]);
	console.log('collections cleared!');
}

async function populateDB() {
	console.log('populating DB...');
	user = await User.create({ email: 'test', password: 'test' });
	jwtToken = await signToken({ id: user.id });
	console.log('DB populated!');
}

describe('Forms API testing', () => {
	before(async () => {
		await connectDB();
		await clearCollections();
		await populateDB();
	});

	after((done) => {
		disconnectDB()
			.then(() => done())
			.catch((err) => done(err));
	});

	describe('GET /forms', () => {
		it('should get all forms', async () => {
			const forms = [
				{
					name: 'form 1',
					authorId: new mongoose.Types.ObjectId(),
				},
				{
					name: 'form 2',
					authorId: new mongoose.Types.ObjectId(),
				},
			];

			const createdForms = await Form.create(forms);

			const response = await chai.request(server).get('/forms');
			response.status.should.equal(200);

			const obtainedForms = response.body.forms;
			chai.should().exist(obtainedForms);
			obtainedForms.should.have.lengthOf(2);
			obtainedForms.should.have.deep.members([
				{
					_id: createdForms[0].id,
					name: createdForms[0].name,
				},
				{
					_id: createdForms[1].id,
					name: createdForms[1].name,
				},
			]);
		});
	});

	describe('GET /forms/:id', () => {
		it('should get full form', async () => {
			const mainFormAuthorId = new mongoose.Types.ObjectId();
			const createdForm = await Form.create({
				name: mainForm.name,
				authorId: mainFormAuthorId,
			});
			const createdQuestions = await Question.create(
				mainFormQuestions.map((question, index) => ({
					...question,
					formId: createdForm.id,
					index,
				}))
			);

			await Promise.all(
				createdQuestions.map((question, questionIndex) =>
					Answer.create(
						mainFormQuestions[questionIndex].answers.map(
							(answer, answerIndex) => ({
								...answer,
								questionId: question.id,
								index: answerIndex,
							})
						)
					)
				)
			);

			const response = await chai
				.request(server)
				.get(`/forms/${createdForm.id}`);
			response.status.should.be.equal(200);
			const obtainedForm = response.body.form;
			chai.should().exist(obtainedForm);

			obtainedForm.should.have.property('name', mainForm.name);
			obtainedForm.should.have.property(
				'authorId',
				mainFormAuthorId.toString()
			);
			chai.should().exist(obtainedForm.questions);
			obtainedForm.questions.should.have.lengthOf(mainFormQuestions.length);
			obtainedForm.questions.forEach((obtainedQuestion, index) => {
				const mainFormQuestion = mainFormQuestions[index];
				obtainedQuestion.should.have.property(
					'question',
					mainFormQuestion.question
				);
				obtainedQuestion.should.have.property(
					'answerType',
					mainFormQuestion.answerType
				);
				chai.should().exist(obtainedQuestion.answers);
				obtainedQuestion.answers.should.have.lengthOf(
					mainFormQuestion.answers.length
				);
				obtainedQuestion.should.have.property('index');

				obtainedQuestion.answers.forEach((obtainedAnswer, answerIndex) => {
					const mainFormQuestionAnswer = mainFormQuestion.answers[answerIndex];
					obtainedAnswer.should.have.property(
						'answer',
						mainFormQuestionAnswer.answer
					);
					// updated to 'should.not.have'
					obtainedAnswer.should.not.have.property(
						'isCorrect',
						mainFormQuestionAnswer.isCorrect
					);
					obtainedAnswer.should.have.property('index');
				});
			});
		});
	});

	describe('POST /forms', () => {
		it('should post form', async () => {
			const { body } = await chai
				.request(server)
				.post('/forms')
				.set('Authorization', `Bearer ${jwtToken}`)
				.send(mainForm);

			const createdForm = await Form.findById(body.formId).exec();
			chai.should().exist(createdForm.id);
			createdForm.name.should.be.equal(mainForm.name);

			const createdQuestions = (
				await Question.find({
					formId: createdForm.id,
				})
					.sort({ index: 1 })
					.populate('answers')
					.exec()
			).map((question) => question.toJSON({ virtuals: true }));

			createdQuestions.should.have.lengthOf(2);
			createdQuestions.forEach((createdQuestion, index) => {
				const question = mainFormQuestions[index];
				createdQuestion.question.should.be.equal(question.question);
				createdQuestion.answerType.should.be.equal(question.answerType);
				createdQuestion.answers.should.have.lengthOf(question.answers.length);

				const answer = question.answers[0];
				const createdQuestionAnswer = createdQuestion.answers[0];
				createdQuestionAnswer.answer.should.be.equal(answer.answer);
				createdQuestionAnswer.isCorrect.should.be.equal(answer.isCorrect);
			});
		});
	});

	describe('PUT /forms/:id', () => {
		it('should update form name', async () => {
			const createdForm = await Form.create({
				name: 'test form',
				authorId: user.id,
			});

			const response = await chai
				.request(server)
				.put(`/forms/${createdForm.id}`)
				.set('Authorization', `Bearer ${await signToken({ id: user.id })}`)
				.send({ name: 'updated name' });

			response.status.should.be.equal(200);
			response.body.updated.should.be.equal(true);

			const updatedForm = await Form.findById(createdForm.id).exec();
			chai.should().not.equal(updatedForm, null);
			updatedForm.should.have.property('name', 'updated name');
		});
	});

	describe('DELETE /forms/:id', () => {
		it('should delete form and its questions', async () => {
			const {
				body: { formId },
			} = await chai
				.request(server)
				.post('/forms')
				.set('Authorization', `Bearer ${jwtToken}`)
				.send(mainForm);

			const questionsIds = (await Question.find({ formId }, '_id').exec()).map(
				(question) => question._id
			);

			const response = await chai
				.request(server)
				.delete(`/forms/${formId}`)
				.set('Authorization', `Bearer ${jwtToken}`);
			response.status.should.be.equal(200);

			const formExists = await Form.exists({ _id: formId });
			formExists.should.be.equal(false);
			const questions = await Question.find({ formId }).exec();
			questions.should.be.eql([]);
			const answers = await Answer.find({
				questionId: { $in: questionsIds },
			});
			answers.should.be.eql([]);
		});
	});
});
