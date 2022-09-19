const express = require("express");
const mongoose = require("mongoose");
const QueryModel = require("../models/queryModel");
const router = express.Router();
const multer = require("multer");
const UserModel = require("../models/userModel");
const QuizModel = require("../models/quizModel");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.imageURL);
  },
});

const upload = multer({ storage: storage });

router.post("/create", upload.single("image"), async (req, res) => {
  console.log(req.body);
  const { userId, quizId, queryType, pointsType, question, answerIndex, answers, timer, imageURL } = req.body;
  if ((!userId, !quizId, !queryType || (!pointsType && pointsType !== 0) || !question || (!answerIndex && answerIndex !== 0) || !answers || !timer))
    return res.status(400).send("Required fields missing");
  if (!mongoose.isValidObjectId(userId)) return res.status(400).send("Invalid User Id");
  if (!mongoose.isValidObjectId(quizId)) return res.status(400).send("Invalid Quiz Id");

  const foundUser = await UserModel.findById(userId);
  if (!foundUser) return res.status(404).send("User does not exist");

  const foundQuiz = await QuizModel.findById(quizId);
  if (!foundQuiz) return res.status(404).send("Quiz does not exist");

  if (req.file) console.log("REQ.FILE:", req.file);

  const newQuery = new QueryModel({
    creatorId: userId,
    quizId,
    queryType,
    pointsType,
    question,
    answerIndex,
    answers,
    timer,
    imageURL,
  });

  try {
    const savedQuery = await newQuery.save();
    const updatedQuiz = await QuizModel.findOneAndUpdate(
      { _id: quizId },
      { $addToSet: { queries: savedQuery._id } },
      { returnDocument: "after" }
    ).populate("queries");
    return res.status(200).json({ msg: "Question creation success", updatedQuiz: updatedQuiz });
  } catch (err) {
    return res.status(501).send(err.message);
  }
});

router.post("/edit", upload.single("image"), async (req, res) => {
  const { userId, queryId, queryType, pointsType, question, answerIndex, answers, timer, imageURL } = req.body;
  if (!userId || !queryId || (!queryType && !pointsType && !question && !answerIndex && !answers && !timer))
    return res.status(400).send("Required fields missing");
  if (!mongoose.isValidObjectId(userId)) return res.status(400).send("Invalid User Id");
  if (!mongoose.isValidObjectId(queryId)) return res.status(400).send("Invalid Query Id");

  const foundUser = await UserModel.findById(userId);
  if (!foundUser) return res.status(404).send("User does not exist");

  const foundQuery = await QueryModel.findById(queryId);
  if (!foundQuery) return res.status(404).send("Question does not exist");

  if (foundQuery.creatorId.toString() !== userId) return res.status(400).send("User is not creator");

  if (queryType) {
    foundQuery.queryType = queryType;
  } else if (pointsType) {
    foundQuery.pointsType = pointsType;
  } else if (question) {
    foundQuery.question = question;
  } else if (answerIndex) {
    foundQuery.answerIndex = answerIndex;
  } else if (answers) {
    foundQuery.answers = answers;
  } else if (timer) {
    foundQuery.timer = timer;
  } else if (imageURL) {
    foundQuery.imageURL = imageURL;
  } else if (req.file) {
    // foundQuery.imageURL = imageURL;
  }

  try {
    const savedQuery = await foundQuery.save();
    return res.status(200).send("Question edit success");
  } catch (err) {
    return res.status(501).send(err.message);
  }
});

router.delete("/:userId/:queryId", async (req, res) => {
  const { userId, queryId } = req.params;

  console.log(userId, queryId);

  if (!userId) return res.status(400).send("Required fields missing");
  if (!mongoose.isValidObjectId(userId)) return res.status(400).send("Invalid User Id");
  if (!mongoose.isValidObjectId(queryId)) return res.status(400).send("Invalid Query Id");

  const foundUser = await UserModel.findById(userId);
  if (!foundUser) return res.status(404).send("User does not exist");

  const foundQuery = await QueryModel.findById(queryId);
  if (!foundQuery) return res.status(404).send("Query does not exist");

  if (foundQuery.creatorId.toString() !== userId) return res.status(501).send("User is not creator");

  const foundQuiz = await QuizModel.findById(foundQuery.quizId);
  if (!foundQuiz) return res.status(404).send("Quiz does not exist");

  foundQuiz.queries = foundQuiz.queries.filter((ele) => ele._id.toString() !== queryId);

  try {
    const deletedQuery = await QueryModel.findOneAndDelete({ _id: queryId });
    const savedQuiz = await foundQuiz.save();
    const populatedQuiz = await QuizModel.findById(savedQuiz._id).populate("queries");
    return res.status(200).json({ msg: "Query deletion success", updatedQuiz: populatedQuiz });
  } catch (err) {
    return res.status(501).send(err.message);
  }
});

module.exports = router;
