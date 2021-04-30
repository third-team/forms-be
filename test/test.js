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

chai.should();
chai.use(chaiHttp);

const requester = chai.request(server);
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
			const res = await requester.get('/forms');
			res.status.should.equal(400);
		});
	});
});
