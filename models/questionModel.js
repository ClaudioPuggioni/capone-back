const mongoose = require("mongoose");

const questionSchema = mongoose.Schema({
  questionType: { type: String, required: true },
  pointsType: { type: Number, required: true },
  question: { type: String, required: true },
  answers: { type: Array, required: true },
  imageUrl: { type: String },
  timer: { type: Number, required: true },
});

const QuestionModel = mongoose.model("Question", questionSchema);

module.exports = QuestionModel;
