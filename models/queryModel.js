const mongoose = require("mongoose");

const querySchema = mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
  queryType: { type: String, required: true },
  pointsType: { type: Number, required: true },
  question: { type: String, required: true },
  answerIndex: { type: Number, required: true },
  answers: { type: Array, required: true },
  timer: { type: Number, required: true },
  imageURL: { type: String },
});

const QueryModel = mongoose.model("Query", querySchema);

module.exports = QueryModel;
