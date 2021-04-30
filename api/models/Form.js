const mongoose = require('mongoose');

/*
  Form -- Answer = one to many relationship
  Answer ref parent (form)
    or
  form refs children (Answers)?
*/

const formSchema = new mongoose.Schema(
	{
		authorId: {
			type: mongoose.ObjectId,
			ref: 'User',
		},
		name: {
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

formSchema.virtual('questions', {
	ref: 'Question',
	localField: '_id',
	foreignField: 'formId',
});

module.exports = mongoose.model('Form', formSchema);
