const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");

const app = express();

const authenticateToken = function (req, res, next) {
  const authHeaderInfo = req.headers["authorization"];
  if (!authHeaderInfo) return res.status(401).send("Authorization is required");

  const token = authHeaderInfo.split(" ")[1];
  if (!token) return res.status(401).send("Invalid token");

  try {
    const payload = jwt.verify(token, process.env.ACCESSTOKEN_SECRET);
    req.userInfo = payload;
    next();
  } catch (err) {
    return res.status(401).send("Invalid token");
  }
};

// Middleware
app.use(express.static("public"));
app.use(express.json());
app.use(morgan("dev"));

// Enable Cors
const corsOptions = {
  origin: "*",
};
app.use(cors(corsOptions));

// Router Imports
const authRouter = require("./routes/authRoutes");
const quizRouter = require("./routes/quizRoutes");
const queryRouter = require("./routes/queryRoutes");

// DB Connection
const DB_URI = "mongodb+srv://caunocau:cPoIdHDwdWihVNVn@cluster0.ddq401z.mongodb.net/capstone1?retryWrites=true&w=majority";

mongoose
  .connect(DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => console.log("Connected to mongoDB"))
  .catch((err) => console.log("Failed connection to mongoDB:", err));

// Connect Routes
app.use("/auth", authRouter);
app.use("/quiz", authenticateToken, quizRouter);
app.use("/query", authenticateToken, queryRouter);

app.listen(1111, () => console.log("Port connected"));
