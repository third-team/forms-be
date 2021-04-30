const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
	{
		answer: {
			type: String,
			required: true,
		},
		isCorrect: {
			type: Boolean,
			required: true,
		},
		questionId: {
			type: mongoose.Types.ObjectId,
			required: true,
		},
		index: {
			type: Number,
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

module.exports = mongoose.model('Answer', answerSchema);
