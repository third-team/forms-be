/* eslint-disable no-undef */
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
const server = app.listen(process.env.PORT);

chai.should();
chai.use(chaiHttp);

let jwtToken = null;

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
			const res = await chai.request(server).get('/forms');
			res.status.should.equal(200);
		});
	});

	describe('POST /forms', () => {
		it('should post form', async () => {
			const questions = [
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
			const { body } = await chai
				.request(server)
				.post('/forms')
				.set('Authorization', `Bearer ${jwtToken}`)
				.send({
					name: 'test form',
					questions,
				});

			const createdForm = await Form.findById(body.formId).exec();
			createdForm.id.should.not.be.equal(null);
			createdForm.name.should.be.equal('test form');

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
				const question = questions[index];
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

	describe('DELETE /forms/:id', () => {
		it('should delete form and its questions', async () => {
			const {
				body: { formId },
			} = await chai
				.request(server)
				.post('/forms')
				.set('Authorization', `Bearer ${jwtToken}`)
				.send({
					name: 'test form',
					questions: [
						{
							question: 'test quesiton 1',
							answerType: 'radio',
							answers: [
								{
									answer: 'test 1',
									isCorrect: true,
								},
							],
						},
						{
							question: 'test quesiton 2',
							answerType: 'checkbox',
							answers: [
								{
									answer: 'test 2',
									isCorrect: false,
								},
							],
						},
					],
				});

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
