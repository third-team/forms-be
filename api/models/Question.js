const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
	{
		formId: {
			type: mongoose.Types.ObjectId,
			required: true,
		},
		index: {
			type: Number,
			require: true,
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

module.exports = mongoose.model('Question', questionSchema);
