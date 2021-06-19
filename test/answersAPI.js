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

const server = app.listen(++process.env.PORT);

let user = null;
let jwtToken = null;

let globalForm;
let globalQuestion;

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

	globalForm = await Form.create({
		authorId: user.id,
		name: 'testForm',
	});
	globalQuestion = await Question.create({
		question: 'test?',
		answerType: 'radio',
		formId: globalForm.id,
		index: 1,
	});
	console.log('DB populated!');
}

function compareAnswers(answer1, answer2) {
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

			obtainedAnswers.sort((a, b) => a.index - b.index);
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

			obtainedAnswers.sort((a, b) => a.index - b.index);
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
			const postedAnswer = {
				answer: 'yos!',
				isCorrect: true,
				questionId: globalQuestion.id,
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
			const response = await chai
				.request(server)
				.post('/answers')
				.set(
					'Authorization',
					`Bearer ${await signToken({ id: new ObjectId() })}`
				)
				.send({
					questionId: globalQuestion.id,
					index: 1,
					answer: 'yos!',
					isCorrect: true,
				});

			response.status.should.be.equal(403);
		});
	});

	describe('PUT /answers/:id', () => {
		it('should update successfully', async () => {
			const createdAnswer = await Answer.create({
				answer: 'true',
				isCorrect: true,
				questionId: globalQuestion.id,
				index: 1,
			});

			const answerUpdate = {
				answer: 'false',
				isCorrect: false,
				questionId: globalQuestion.id,
				index: 3,
			};

			const response = await chai
				.request(server)
				.put(`/answers/${createdAnswer.id}`)
				.set('Authorization', `Bearer ${jwtToken}`)
				.send(answerUpdate);

			response.status.should.be.equal(200);
			response.body.should.have.property('updated', true);

			const updatedAnswer = await Answer.findById(createdAnswer.id).exec();
			chai.should().exist(updatedAnswer);
			compareAnswers({ ...answerUpdate, _id: createdAnswer.id }, updatedAnswer);
		});

		it('should update other indices when given is already taken', async () => {
			const createdAnswers = await Answer.create(
				[
					...mainAnswers,
					{
						answer: 'test4?',
						index: 4,
						isCorrect: true,
					},
				].map((answer) => ({
					...answer,
					questionId: globalQuestion.id,
				}))
			);
			const answerUpdate = {
				index: 1,
			};
			const response = await chai
				.request(server)
				.put(`/answers/${createdAnswers[3].id}`)
				.set('Authorization', `Bearer ${jwtToken}`)
				.send(answerUpdate);

			response.status.should.be.equal(200);
			const obtainedAnswers = await Answer.find({
				_id: { $in: createdAnswers.map((answer) => answer.id) },
			})
				.sort({ index: 1 })
				.exec();

			const answersShouldBe = [
				{ ...createdAnswers[3].toJSON(), index: 1 },
				...[createdAnswers[0], createdAnswers[1], createdAnswers[2]].map(
					(answer) => ({ ...answer.toJSON(), index: answer.index + 1 })
				),
			];
			obtainedAnswers.forEach((obtainedAnswer, answerIndex) => {
				compareAnswers(
					{
						answer: obtainedAnswer.answer,
						isCorrect: obtainedAnswer.isCorrect,
						index: obtainedAnswer.index,
						_id: obtainedAnswer._id.toString(),
						questionId: obtainedAnswer.questionId.toString(),
					},
					answersShouldBe[answerIndex]
				);
			});
		});

		it('should get 403 Forbidden status', async () => {
			const createdAnswer = await Answer.create({
				answer: 'true',
				isCorrect: true,
				questionId: globalQuestion.id,
				index: 1,
			});

			const answerUpdate = {
				index: 3,
			};

			const response = await chai
				.request(server)
				.put(`/answers/${createdAnswer.id}`)
				.set(
					'Authorization',
					`Bearer ${await signToken({ id: new ObjectId() })}`
				)
				.send(answerUpdate);

			response.status.should.be.equal(403);
		});
	});

	describe('DELETE /answers/:id', () => {
		it('should delete successfully', async () => {
			const answer = {
				answer: 'testAnswer',
				isCorrect: true,
				questionId: globalQuestion.id,
				index: 1,
			};

			const createdAnswer = await Answer.create(answer);
			const response = await chai
				.request(server)
				.delete(`/answers/${createdAnswer.id}`)
				.set('Authorization', `Bearer ${jwtToken}`);

			response.status.should.be.equal(200);
			response.body.should.have.property('deleted', true);

			const answerExists = await Answer.exists({ _id: createdAnswer.id });
			answerExists.should.be.equal(false);
		});

		it('should get 403 Forbidden status', async () => {
			const createdAnswer = await Answer.create({
				answer: 'true',
				isCorrect: true,
				questionId: globalQuestion.id,
				index: 1,
			});

			const answerUpdate = {
				index: 3,
			};

			const response = await chai
				.request(server)
				.put(`/answers/${createdAnswer.id}`)
				.set(
					'Authorization',
					`Bearer ${await signToken({ id: new ObjectId() })}`
				)
				.send(answerUpdate);

			response.status.should.be.equal(403);
		});
	});
});
