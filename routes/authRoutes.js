const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const jwt = require("jsonwebtoken");
const UserModel = require("../models/userModel");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const generateTokens = function (payload) {
  let accessToken = jwt.sign(payload, process.env.ACCESSTOKEN_SECRET, { expiresIn: process.env.ACCESSTOKEN_EXPIRATION });
  let refreshToken = jwt.sign(payload, process.env.REFRESHTOKEN_SECRET, { expiresIn: process.env.REFRESHTOKEN_EXPIRATION });
  return { accessToken, refreshToken };
};

// Sign up
router.post("/signup", async (req, res) => {
  const { username, email, password, passwordCheck } = req.body;

  if (!username || !email || !password || !passwordCheck) return res.status(400).send("Required fields missing");
  if (password !== passwordCheck) return res.status(400).send("Passwords do not match");

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = new UserModel({
    username,
    email,
    password: hashedPassword,
  });

  try {
    const savedUser = await newUser.save();
    const editedUser = savedUser.toJSON();
    delete editedUser.password;

    let { accessToken, refreshToken } = generateTokens({ id: savedUser._id, email: savedUser.email });

    return res.status(201).json({ msg: "User created successfully", userInfo: editedUser, accessToken, refreshToken });
  } catch (err) {
    if (Object.keys(err.keyValue)[0] === "username") return res.status(501).send("Username already exists");
    if (Object.keys(err.keyValue)[0] === "email") return res.status(501).send("Email already exists");
  }
});

// Log in
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send("Required fields missing");

  const foundUser = await UserModel.findOne({ email: email });
  if (!foundUser) return res.status(404).send("Account does not exist");

  const match = await bcrypt.compare(password, foundUser.password);
  if (!match) return res.status(401).send("Invalid credentials");

  const editedUser = foundUser.toJSON();
  delete editedUser.password;

  const { accessToken, refreshToken } = generateTokens({ id: foundUser._id, email: foundUser.email });

  return res.status(201).json({ msg: "User logged in successfully", userInfo: editedUser, accessToken, refreshToken });
});

// Refresh tokens
router.post("/token", async (req, res) => {
  const { email } = req.body;
  const refresh_token = req.body.refreshToken;

  if (!email || !refresh_token) return res.status(400).send("Required fields missing");

  const foundUser = await UserModel.findOne({ email: email });
  if (!foundUser) return res.status(404).send("Account does not exist");

  try {
    const payload = jwt.verify(refresh_token, process.env.REFRESHTOKEN_SECRET);

    const { accessToken, refreshToken } = generateTokens({ id: payload.id, email: foundUser.email });

    const editedUser = foundUser.toJSON();
    delete editedUser.password;

    return res.status(201).json({ msg: "Tokens refreshed successfully", accessToken, refreshToken });
  } catch (err) {
    return res.status(401).send(err.message);
  }
});

module.exports = router;
