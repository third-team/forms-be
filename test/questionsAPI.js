/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');
const { disconnectDB } = require('../mongoDBConnect');
const Form = require('../api/models/Form');
const Question = require('../api/models/Question');
const Answer = require('../api/models/Answer');
const User = require('../api/models/User');
const { signToken } = require('../api/utils/jwtUtils');
const { ObjectId } = require('mongoose').Types.ObjectId;

chai.should();
chai.use(chaiHttp);

let jwtToken = null;
let form = null;

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
		await clearCollections();
		await populateDB();
	});

	after((done) => {
		disconnectDB()
			.then(() => done())
			.catch((err) => done(err));
	});

	// describe('POST /questions', () => {
	// 	function getPoster() {
	// 		return chai
	// 			.request(server)
	// 			.post('/questions')
	// 			.set('Authorization', `Bearer ${jwtToken}`);
	// 	}

	// 	it('Should get status 201', async () => {
	// 		const response = await chai
	// 			.request(server)
	// 			.post('/questions')
	// 			.set('Authorization', `Bearer ${jwtToken}`)
	// 			.send({
	// 				formId: form.id,
	// 				question: 'test question',
	// 				answerType: 'radio',
	// 				answers: null,
	// 			});
	// 		response.status.should.equal(201);
	// 	});

	// 	it('Should get status 401', async () => {
	// 		const response = await chai.request(server).post('/questions').send({
	// 			formId: form.id,
	// 			question: 'test question',
	// 			answerType: 'radio',
	// 			answers: null,
	// 		});
	// 		response.status.should.equal(401);
	// 	});

	// 	it('Should get status 400', async () => {
	// 		console.log('should get status 400 started');
	// 		await Question.deleteMany({}).exec();
	// 		const question = {
	// 			formId: form.id,
	// 			question: 'test question',
	// 			answerType: 'radio',
	// 			answers: null,
	// 		};

	// 		let invalidQuestion = getCopy(question);
	// 		delete invalidQuestion.formId;
	// 		let response = await getPoster().send(invalidQuestion);
	// 		response.status.should.equal(400);

	// 		invalidQuestion = getCopy(question);
	// 		delete invalidQuestion.answerType;
	// 		response = await getPoster().send(invalidQuestion);
	// 		response.status.should.equal(400);

	// 		invalidQuestion = getCopy(question);
	// 		delete invalidQuestion.question;
	// 		response = await getPoster().send(invalidQuestion);
	// 		response.status.should.equal(400);

	// 		invalidQuestion = getCopy(question);
	// 		delete invalidQuestion.answers;
	// 		response = await getPoster().send(invalidQuestion);
	// 		console.log(response.status, response.body);
	// 		response.status.should.equal(201);

	// 		const questions = await Question.find({}).exec();
	// 		questions.should.be.an('array').and.have.lengthOf(1);
	// 	});

	// 	/*
	// 		Don't know why, but I cannot do smth like this

	// 		const sender = chai
	// 			.request(server)
	// 			.post('/questions')
	// 			.set('Authorization', `Bearer ${jwtToken}`)

	// 		const response = await sender.send(question); // 3 times in a row

	// 		It sends only once and it drives me insane!!!
	// 	*/
	// 	it('Should have 3 questions with indices [0, 1, 2]', async () => {
	// 		await Question.deleteMany({}).exec();

	// 		const question = {
	// 			formId: form.id,
	// 			question: 'test question',
	// 			answerType: 'radio',
	// 			answers: null,
	// 		};

	// 		/*
	// 			Works nice, but it looks like server cannot properly handle almost simultaneous requests:
	// 			every question gets index 0.

	// 			const requestsSendPromises = [];

	// 			for (let i = 0; i < 3; ++i) {
	// 				question.question = `question #${i + 1}`;
	// 				requestsSendPromises.push(
	// 					chai
	// 						.request(server)
	// 						.post('/questions')
	// 						.set('Authorization', `Bearer ${jwtToken}`)
	// 						.send(question)
	// 				);
	// 			}

	// 			const responses = await Promise.all(requestsSendPromises);
	// 			responses.forEach((response) => response.status.should.equal(201));
	// 		*/

	// 		for (let i = 0; i < 3; ++i) {
	// 			question.question = `question #${i + 1}`;
	// 			// eslint-disable-next-line no-await-in-loop
	// 			const response = await getPoster().send(question);

	// 			response.status.should.equal(201);
	// 		}

	// 		const questions = await Question.find({}).sort({ index: 1 }).exec();
	// 		questions.should.have.lengthOf(3);
	// 		const questionsIndices = questions.map((q) => q.index);
	// 		questionsIndices.should.eql([0, 1, 2]);
	// 	});

	// 	it('Questions should go in given order', async () => {
	// 		await Question.deleteMany({}).exec();
	// 		const question = {
	// 			formId: form.id,
	// 			question: 'test question',
	// 			answerType: 'radio',
	// 			answers: null,
	// 		};

	// 		question.question = '1';
	// 		let response = await getPoster().send(question);
	// 		response.status.should.equal(201);

	// 		question.question = '2';
	// 		response = await getPoster().send(question);

	// 		response.status.should.equal(201);
	// 		question.question = '3';
	// 		response = await getPoster.send({ ...question, index: 1 });
	// 		response.status.should.equal(201);

	// 		const questions = await Question.find({}).sort({ index: 1 }).exec();
	// 		questions.should.have.lengthOf(3);
	// 		const questionsIndices = questions.map((q) => q.question);
	// 		questionsIndices.should.eql(['1', '3', '2']);
	// 	});
	// });

	// describe('GET /questions', () => {
	// 	before(async () => {
	// 		await clearCollections();
	// 		await populateDB();
	// 	});

	// 	it('Should GET all questions', async () => {
	// 		const questions = await Question.insertMany([
	// 			{
	// 				question: 'question 1',
	// 				answerType: 'radio',
	// 				formId: form.id,
	// 				index: 1,
	// 				answers: [],
	// 			},
	// 			{
	// 				question: 'question 2',
	// 				answerType: 'checkbox',
	// 				formId: form.id,
	// 				index: 3,
	// 				answers: [],
	// 			},
	// 			{
	// 				question: 'question 3',
	// 				answerType: 'radio',
	// 				formId: form.id,
	// 				index: 2,
	// 				answers: [],
	// 			},
	// 		]);

	// 		const answer = await Answer.create({
	// 			questionId: questions[0].id,
	// 			answer: 'answer 1',
	// 			index: 1,
	// 			isCorrect: true,
	// 		});

	// 		const response = await chai.request(server).get('/questions').send();
	// 		response.status.should.equal(200);

	// 		const responseQuestions = response.body.questions;

	// 		questions.sort((a, b) => a.index - b.index);

	// 		for (let i = 0; i < responseQuestions.length; ++i) {
	// 			const question = questions[i];
	// 			const gotQuestion = responseQuestions[i];

	// 			getQuestionObject(question).should.be.eql(
	// 				getQuestionObject(gotQuestion)
	// 			);
	// 		}

	// 		const questionAnswers = responseQuestions.find((q) => q.index === 1)
	// 			.answers;
	// 		questionAnswers.should.be.an('array').and.have.lengthOf(1);
	// 		const questionAnswer = questionAnswers[0];
	// 		getAnswerObject(answer).should.be.eql(getAnswerObject(questionAnswer));
	// 	});
	// });

	describe('GET /questions/:id', () => {
		before(async () => {
			await clearCollections();
			await populateDB();
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
			console.log(actualQuestion);

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
});
