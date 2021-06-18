const Form = require('../models/Form');
const Question = require('../models/Question');

async function doesQuestionBelongToUser(questionId, userId) {
	try {
		const question = await Question.findById(questionId, 'formId').exec();
		if (!question) {
			return false;
		}

		return await Form.exists({ _id: question.formId, authorId: userId });
	} catch (err) {
		console.error('doesQuestionBelongToUser():', err.message);
		return false;
	}
}

module.exports = {
	doesQuestionBelongToUser,
};
