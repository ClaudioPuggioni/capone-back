const express = require("express");
const mongoose = require("mongoose");
const QuizModel = require("../models/quizModel");
const UserModel = require("../models/userModel");
const router = express.Router();

// Get All Quizzes of One User
router.get("/:id", async (req, res) => {
  const userId = req.params.id;
  if (!userId) return res.status(400).send("Required fields missing");
  if (!mongoose.isValidObjectId(userId)) return res.status(400).send("Invalid User Id");

  const foundUser = await UserModel.findById(userId).populate({ path: "quizzes", populate: { path: "queries" } });
  if (!foundUser) return res.status(404).send("User does not exist");

  return res.status(200).json(foundUser.quizzes);
});

// Get One Quiz of One User
router.get("/one/:userId/:quizId", async (req, res) => {
  const { userId, quizId } = req.params;
  if (!userId || !quizId) return res.status(400).send("Required fields missing");
  if (!mongoose.isValidObjectId(userId)) return res.status(400).send("Invalid User Id");
  if (!mongoose.isValidObjectId(quizId)) return res.status(400).send("Invalid Quiz Id");

  const foundUser = await UserModel.findById(userId);
  if (!foundUser) return res.status(404).send("User does not exist");

  const foundQuiz = await QuizModel.findById(quizId).populate("queries");
  if (!foundQuiz) return res.status(404).send("Quiz does not exist");

  if (foundQuiz.creatorId.toString() !== userId) return res.status(501).send("User is not creator");

  return res.status(200).json({ msg: "Quiz retrieved successfully", retrievedQuiz: foundQuiz });
});

// Create One Quiz
router.post("/create", async (req, res) => {
  const { userId, title } = req.body;
  if (!userId || !title) return res.status(400).send("Required fields missing");
  if (!mongoose.isValidObjectId(userId)) return res.status(400).send("Invalid User Id");

  const foundUser = await UserModel.findById(userId);
  if (!foundUser) return res.status(404).send("User does not exist");

  const newQuiz = new QuizModel({
    creatorId: userId,
    title,
  });

  try {
    const savedQuiz = await newQuiz.save();
    foundUser.quizzes.push(savedQuiz._id);
    console.log(savedQuiz);
    const savedUser = await foundUser.save();
    return res.status(201).json({ msg: "Quiz creation success", createdQuiz: savedQuiz });
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

// Update Queries of One Quiz
router.post("/editQueries", async (req, res) => {
  const { userId, quizId, queries } = req.body;
  if (!userId || !quizId || !queries) return res.status(400).send("Required fields missing");
  if (!mongoose.isValidObjectId(userId)) return res.status(400).send("Invalid User Id");
  if (!mongoose.isValidObjectId(quizId)) return res.status(400).send("Invalid Quiz Id");

  const foundUser = await UserModel.findById(userId);
  if (!foundUser) return res.status(404).send("User does not exist");

  const foundQuiz = await QuizModel.findById(quizId);
  if (!foundQuiz) return res.status(404).send("Quiz does not exist");

  foundQuiz.queries = queries;

  try {
    const savedQuiz = await foundQuiz.save();
    const populatedQuiz = await QuizModel.findById(savedQuiz._id).populate("queries");
    return res.status(201).json({ msg: "Quiz queries edit success", updatedQuiz: populatedQuiz });
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

// Delete One Quiz
router.delete("/:userId/:quizId", async (req, res) => {
  const { userId, quizId } = req.params;
  if (!userId || !quizId) return res.status(400).send("Required fields missing");
  if (!mongoose.isValidObjectId(userId)) return res.status(400).send("Invalid User Id");
  if (!mongoose.isValidObjectId(quizId)) return res.status(400).send("Invalid Quiz Id");

  const foundUser = await UserModel.findById(userId);
  if (!foundUser) return res.status(404).send("User does not exist");

  const foundQuiz = await QuizModel.findById(quizId);
  if (!foundQuiz) return res.status(404).send("Quiz does not exist");

  if (foundQuiz.creatorId.toString() !== userId) return res.status(501).send("User is not creator");

  foundUser.quizzes = foundUser.quizzes.filter((ele) => ele._id.toString() !== quizId);

  try {
    const deletedQuiz = await QuizModel.findOneAndDelete({ _id: quizId });
    const savedUser = await foundUser.save();
    return res.status(201).send("Quiz deletion success");
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

module.exports = router;
