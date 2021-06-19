const mongoose = require('mongoose');
const Answer = require('./Answer');

const questionSchema = new mongoose.Schema(
	{
		formId: {
			type: mongoose.Types.ObjectId,
			required: true,
		},
		index: {
			type: Number,
			required: true,
		},
		question: {
			type: String,
			required: true,
		},
		answerType: {
			type: String,
			required: true,
		},
	},
	{
		toJSON: {
			transform(doc, ret) {
				delete ret.id;
				delete ret.__v;
			},
		},
	}
);

questionSchema.virtual('answers', {
	ref: 'Answer',
	localField: '_id',
	foreignField: 'questionId',
});

questionSchema.methods.drop = async function () {
	if (!this.id) return;
	await Answer.deleteMany({ questionId: this.id }).exec();
	await this.delete();
};

module.exports = mongoose.model('Question', questionSchema);
