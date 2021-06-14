/* eslint-disable no-undef */
const {
	Types: { ObjectId },
} = require('mongoose');
const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');
const User = require('../api/models/User');
const Form = require('../api/models/Form');
const Question = require('../api/models/Question');
const Answer = require('../api/models/Answer');
const { connectDB, disconnectDB } = require('../mongoDBConnect');
const { signToken } = require('../api/utils/jwtUtils');
require('dotenv').config();

process.env.testing = true;

const server = app.listen(process.env.PORT);
let user = null;
let jwtToken = null;

chai.should();
chai.use(chaiHttp);

const mainAnswers = [
	{
		answer: 'test1?',
		isCorrect: true,
		questionId: new ObjectId(),
		index: 1,
	},
	{
		answer: 'test2?',
		isCorrect: false,
		questionId: new ObjectId(),
		index: 2,
	},
	{
		answer: 'test3?',
		isCorrect: false,
		questionId: new ObjectId(),
		index: 3,
	},
];

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

async function populateDB() {
	console.log('populating DB...');
	user = await User.create({ email: 'test', password: 'test' });
	jwtToken = await signToken({ id: user.id });
	console.log('DB populated!');
}

function compareAnswers(answer1, answer2) {
	console.log('answer1:', answer1);
	console.log('answer2:', answer2);
	answer1.should.have.property('_id', answer2._id.toString());
	answer1.should.have.property('answer', answer2.answer);
	answer1.should.have.property('isCorrect', answer2.isCorrect);
	answer1.should.have.property('questionId', answer2.questionId.toString());
	answer1.should.have.property('index', answer2.index);
}

describe('Answers API testing', () => {
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

	describe('GET /answers', () => {
		beforeEach(async () => {
			await Answer.deleteMany({}).exec();
		});

		it('should get all answers', async () => {
			const createdAnswers = await Answer.create(mainAnswers);

			const response = await chai.request(server).get('/answers');
			response.status.should.be.equal(200);
			const obtainedAnswers = response.body.answers;
			chai.should().exist(obtainedAnswers);
			obtainedAnswers.should.be.an('array');
			obtainedAnswers.should.have.lengthOf(3);

			obtainedAnswers.sort((a, b) => a - b);
			obtainedAnswers.forEach((obtainedAnswer, obtainedAnswerIndex) => {
				const createdAnswer = createdAnswers[obtainedAnswerIndex];
				compareAnswers(obtainedAnswer, createdAnswer);
			});
		});

		it('should return only answers, which belong to specified question', async () => {
			const { questionId } = mainAnswers[0];
			const createdAnswers = await Answer.create([
				mainAnswers[0],
				{
					...mainAnswers[1],
					questionId,
				},
				mainAnswers[2],
			]);

			const response = await chai
				.request(server)
				.get(`/answers?questionId=${questionId}`);
			response.status.should.be.equal(200);
			const obtainedAnswers = response.body.answers;
			chai.should().exist(obtainedAnswers);
			obtainedAnswers.should.be.an('array');
			obtainedAnswers.should.have.lengthOf(2);

			obtainedAnswers.sort((a, b) => a - b);
			obtainedAnswers.forEach((obtainedAnswer, obtainedAnswerIndex) => {
				const createdAnswer = createdAnswers[obtainedAnswerIndex];
				compareAnswers(obtainedAnswer, createdAnswer);
			});
		});

		it('should get status 400', async () => {
			const response = await chai
				.request(server)
				.get(`/answers?questionId=${'zzzzzzzzzzzzzzzzzzzzzzzz'}`);

			response.status.should.be.be.equal(400);
		});
	});

	describe('GET /answers/:id', () => {
		it('should get the answer with given id', async () => {
			const createdAnswer = await Answer.create(mainAnswers[0]);

			const response = await chai
				.request(server)
				.get(`/answers/${createdAnswer._id}`);
			response.status.should.be.equal(200);
			const obtainedAnswer = response.body.answer;
			chai.should().exist(obtainedAnswer);

			compareAnswers(obtainedAnswer, createdAnswer);
		});

		it('should get status 400', async () => {
			await Answer.create(mainAnswers[0]);

			const response = await chai
				.request(server)
				.get(`/answers/${'zzzzzzzzzzzzzzzzzzzzzzzz'}`);
			response.status.should.be.equal(400);
		});
	});

	describe('POST /answers', () => {
		it('should successfully post answer', async () => {
			const createdForm = await Form.create({
				authorId: user.id,
				name: 'testForm',
			});
			const formQuestion = await Question.create({
				question: 'test?',
				answerType: 'radio',
				formId: createdForm.id,
				index: 1,
			});
			const postedAnswer = {
				answer: 'yos!',
				isCorrect: true,
				questionId: formQuestion.id,
				index: 1,
			};
			const response = await chai
				.request(server)
				.post('/answers')
				.set('Authorization', `Bearer ${jwtToken}`)
				.send(postedAnswer);

			response.status.should.be.equal(201);
			const { answerId } = response.body;
			chai.should().exist(answerId);
			const createdAnswer = await Answer.findById(answerId).exec();
			chai.should().exist(createdAnswer);
			compareAnswers({ ...postedAnswer, _id: answerId }, createdAnswer);
		});

		it('should get status 403 Forbidden', async () => {
			const createdForm = await Form.create({
				name: 'testForm',
				authorId: new ObjectId(),
			});
			const createdQuestion = await Question.create({
				question: 'test?',
				answerType: 'checkbox',
				formId: createdForm.id,
				index: 2,
			});
			const response = await chai
				.request(server)
				.post('/answers')
				.set(
					'Authorization',
					`Bearer ${await signToken({ id: new ObjectId() })}`
				)
				.send({
					questionId: createdQuestion.id,
					index: 1,
					answer: 'yos!',
					isCorrect: true,
				});

			response.status.should.be.equal(403);
		});
	});
});
