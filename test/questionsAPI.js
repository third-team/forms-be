/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
const chai = require('chai');
const chaiHttp = require('chai-http');
const { ObjectId } = require('mongoose').Types.ObjectId;
// const server = require('../server');
const { connectDB } = require('../mongoDBConnect');
const app = require('../app');
const { disconnectDB } = require('../mongoDBConnect');
const Form = require('../api/models/Form');
const Question = require('../api/models/Question');
const Answer = require('../api/models/Answer');
const User = require('../api/models/User');
const { signToken } = require('../api/utils/jwtUtils');
require('dotenv').config();

process.env.PORT = 5007;
process.env.testing = true;

const server = app.listen(process.env.PORT);

chai.should();
chai.use(chaiHttp);

let jwtToken = null;
let form = null;

async function clearAllCollections() {
	console.log('clearing collections...');
	await Promise.all([
		User.deleteMany({}).exec(),
		Form.deleteMany({}).exec(),
		Question.deleteMany({}).exec(),
		Answer.deleteMany({}).exec(),
	]);
	console.log('collections cleared!');
}

async function clearCollections() {
	await Promise.all([
		Question.deleteMany({}).exec(),
		Answer.deleteMany({}).exec(),
	]);
}

async function populateDB() {
	console.log('populating DB...');
	const user = await User.create({ email: 'test', password: 'test' });
	jwtToken = await signToken({ id: user.id });

	form = await Form.create({
		name: 'test',
		questions: [],
	});
	console.log('DB populated!');
}

function getCopy(obj) {
	const newObj = {};
	// eslint-disable-next-line no-return-assign
	Object.keys(obj).forEach((key) => (newObj[key] = obj[key]));

	return newObj;
}

function getQuestionObject(question) {
	return {
		_id: question._id.toString(),
		question: question.question,
		formId: question.formId.toString(),
		answerType: question.answerType,
		index: question.index,
		answers: [],
	};
}

function getAnswerObject(answer) {
	return {
		_id: answer._id.toString(),
		answer: answer.answer,
		questionId: answer.questionId.toString(),
		isCorrect: answer.isCorrect,
		index: answer.index,
	};
}

describe('Questions API testing', () => {
	before(async () => {
		await connectDB();
		await clearAllCollections();
		await populateDB();
	});

	after((done) => {
		disconnectDB()
			.then(() => done())
			.catch((err) => done(err));
	});

	describe('POST /questions', () => {
		beforeEach(async () => {
			await Question.deleteMany({}).exec();
		});

		function getPoster() {
			return chai
				.request(server)
				.post('/questions')
				.set('Authorization', `Bearer ${jwtToken}`);
		}

		it('Should get status 201', async () => {
			const response = await chai
				.request(server)
				.post('/questions')
				.set('Authorization', `Bearer ${jwtToken}`)
				.send({
					formId: form.id,
					question: 'test question',
					answerType: 'radio',
					answers: null,
				});
			response.status.should.equal(201);
		});

		it('Should get status 401', async () => {
			const response = await chai.request(server).post('/questions').send({
				formId: form.id,
				question: 'test question',
				answerType: 'radio',
				answers: null,
			});
			response.status.should.equal(401);
		});

		it('Should get status 400', async () => {
			const question = {
				formId: form.id,
				question: 'test question',
				answerType: 'radio',
				answers: null,
			};

			let invalidQuestion = getCopy(question);
			delete invalidQuestion.formId;
			let response = await getPoster().send(invalidQuestion);
			response.status.should.equal(400);

			invalidQuestion = getCopy(question);
			delete invalidQuestion.answerType;
			response = await getPoster().send(invalidQuestion);
			response.status.should.equal(400);

			invalidQuestion = getCopy(question);
			delete invalidQuestion.question;
			response = await getPoster().send(invalidQuestion);
			response.status.should.equal(400);

			invalidQuestion = getCopy(question);
			delete invalidQuestion.answers;
			response = await getPoster().send(invalidQuestion);
			response.status.should.equal(201);

			const questions = await Question.find({}).exec();
			questions.should.be.an('array').and.have.lengthOf(1);
		});

		/*
			Don't know why, but I cannot do smth like this

			const sender = chai
				.request(server)
				.post('/questions')
				.set('Authorization', `Bearer ${jwtToken}`)

			const response = await sender.send(question); // 3 times in a row

			It sends only once and it drives me insane!!!
		*/
		it('Should have 3 questions with indices [0, 1, 2]', async () => {
			const question = {
				formId: form.id,
				question: 'test question',
				answerType: 'radio',
				answers: null,
			};

			for (let i = 0; i < 3; ++i) {
				question.question = `question #${i + 1}`;
				// eslint-disable-next-line no-await-in-loop
				const response = await getPoster().send(question);

				response.status.should.equal(201);
			}

			const questions = await Question.find({}).sort({ index: 1 }).exec();
			questions.should.have.lengthOf(3);
			const questionsIndices = questions.map((q) => q.index);
			questionsIndices.should.eql([0, 1, 2]);
		});

		it('Questions should go in given order', async () => {
			const question = {
				formId: form.id,
				question: 'test question',
				answerType: 'radio',
				answers: null,
			};

			question.question = '1';
			let response = await getPoster().send(question);
			response.status.should.equal(201);

			question.question = '2';
			response = await getPoster().send(question);

			response.status.should.equal(201);
			question.question = '3';
			response = await getPoster().send({ ...question, index: 1 });
			response.status.should.equal(201);

			const questions = await Question.find({}).sort({ index: 1 }).exec();
			questions.should.have.lengthOf(3);
			const questionsIndices = questions.map((q) => q.question);
			questionsIndices.should.eql(['1', '3', '2']);
		});
	});

	describe('GET /questions', () => {
		before(async () => {
			await clearCollections();
		});

		it('Should GET all questions', async () => {
			const questions = await Question.insertMany([
				{
					question: 'question 1',
					answerType: 'radio',
					formId: form.id,
					index: 1,
					answers: [],
				},
				{
					question: 'question 2',
					answerType: 'checkbox',
					formId: form.id,
					index: 3,
					answers: [],
				},
				{
					question: 'question 3',
					answerType: 'radio',
					formId: form.id,
					index: 2,
					answers: [],
				},
			]);

			const answer = await Answer.create({
				questionId: questions[0].id,
				answer: 'answer 1',
				index: 1,
				isCorrect: true,
			});

			const response = await chai.request(server).get('/questions').send();
			response.status.should.equal(200);

			const responseQuestions = response.body.questions;

			questions.sort((a, b) => a.index - b.index);

			for (let i = 0; i < responseQuestions.length; ++i) {
				const question = questions[i];
				const gotQuestion = responseQuestions[i];

				getQuestionObject(question).should.be.eql(
					getQuestionObject(gotQuestion)
				);
			}

			const questionAnswers = responseQuestions.find(
				(q) => q.index === 1
			).answers;
			questionAnswers.should.be.an('array').and.have.lengthOf(1);
			const questionAnswer = questionAnswers[0];
			getAnswerObject(answer).should.be.eql(getAnswerObject(questionAnswer));
		});
	});

	describe('GET /questions/:id', () => {
		before(async () => {
			await clearCollections();
		});

		it('Should get one question', async () => {
			const question = {
				formId: form.id,
				question: 'test question',
				answerType: 'radio',
				answers: null,
			};
			const expectedQuestion = await Question.create(question);

			const response = await chai
				.request(server)
				.get(`/questions/${expectedQuestion.id}`);

			response.status.should.equal(200);

			const actualQuestion = response.body.question;

			getQuestionObject(actualQuestion).should.be.eql(
				getQuestionObject(expectedQuestion)
			);
		});

		it('Should get response 404', async () => {
			const response = await chai
				.request(server)
				.get(`/questions/${new ObjectId().toString()}`);
			response.status.should.equal(404);
		});
	});

	describe('PUT /questions/:id', () => {
		beforeEach(async () => {
			await clearCollections();
		});

		it('Question should be updated', async () => {
			const q = {
				formId: form.id,
				question: 'test question',
				answerType: 'radio',
				answers: null,
			};

			const answer = {
				answer: 'test answer',
				isCorrect: true,
				index: 4,
			};

			const questionUpdate = {
				question: 'updated',
				answerType: 'checkbox',
				index: 3,
				answers: [answer],
			};

			const question = await Question.create(q);

			Object.keys(questionUpdate).forEach((key) => {
				question[key] = questionUpdate[key];
			});

			let response = await chai
				.request(server)
				.put(`/questions/${question.id}`)
				.set('Authorization', `Bearer ${jwtToken}`)
				.send(questionUpdate);

			response.status.should.be.equal(200);
			response.body.updated.should.be.true;

			response = await chai.request(server).get(`/questions/${question.id}`);

			response.status.should.be.equal(200);
			const updatedQuestion = response.body.question;
			updatedQuestion.should.not.be.undefined;
			getQuestionObject(updatedQuestion).should.be.eql(
				getQuestionObject(question)
			);
			updatedQuestion.should.have.ownProperty('answers');
			updatedQuestion.answers.should.be.an('array');
			updatedQuestion.answers.should.have.lengthOf(1);
			const updatedAnswer = question.answers[0];
			const testAnswer = {
				answer: updatedAnswer.answer,
				isCorrect: updatedAnswer.isCorrect,
				index: updatedAnswer.index,
			};

			testAnswer.should.eql({
				answer: answer.answer,
				isCorrect: answer.isCorrect,
				index: answer.index,
			});
		});

		/*
			for now there is an error when I try to use transactions:
			'This MongoDB deployment does not support retryable writes.
			Please add retryWrites=false to your connection string.'.
			so for now, if one answer is invalid,
			all the answers after it will not be saved to db.

			With transactions this test is invalid, so is pending for reference.
		*/
		it('Should add two first answers and get status 400', async () => {
			const q = {
				formId: form.id,
				question: 'test question',
				answerType: 'radio',
				answers: null,
			};

			const answers = [
				{
					answer: '1',
					isCorrect: true,
					index: 3,
				},
				{
					answer: '2',
					isCorrect: true,
					index: 4,
				},
				{
					answer: '3',
					index: 5,
				},
			];

			let question = await Question.create(q);
			let response = await chai
				.request(server)
				.put(`/questions/${question.id}`)
				.set('Authorization', `Bearer ${jwtToken}`)
				.send({
					question: 'test',
					answers,
				});
			response.status.should.be.equal(400);

			response = await chai.request(server).get(`/questions/${question.id}`);
			response.status.should.be.equal(200);
			question = response.body.question;
			question.question.should.be.equal('test question');
			question.answers.should.be.eql([]);
		});
	});

	describe('DELETE /questions/:id', () => {
		it('Should delete question and all its answers', async () => {
			const q = {
				formId: form.id,
				question: 'test question',
				answerType: 'radio',
				answers: null,
			};

			const answers = [
				{
					answer: '1',
					isCorrect: true,
					index: 3,
				},
				{
					answer: '2',
					isCorrect: true,
					index: 4,
				},
				{
					answer: '3',
					isCorrect: false,
					index: 5,
				},
			];

			const question = await Question.create(q);
			await Answer.create(
				answers.map((answer) => ({ ...answer, questionId: question.id }))
			);

			const response = await chai
				.request(server)
				.delete(`/questions/${question.id}`)
				.set('Authorization', `Bearer ${jwtToken}`)
				.send();

			response.status.should.be.equal(200);
			response.body.deleted.should.be.true;

			let result = await Question.findById(question.id);
			chai.should().equal(result, null);

			result = await Answer.find({
				_id: { $in: answers.map((answer) => answer.id) },
			}).exec();

			result.should.be.eql([]);
		});
	});
});
