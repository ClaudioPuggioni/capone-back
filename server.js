const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { Server } = require("socket.io");

const app = express();

// // Enable Cors
const corsOptions = {
  origin: "*",
};
app.use(cors(corsOptions));

const httpServer = app.listen(1111);
const io = new Server(httpServer, {
  cors: {
    origins: "*",
  },
});

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

// Router Imports
const authRouter = require("./routes/authRoutes");
const queryRouter = require("./routes/queryRoutes");
const quizRouter = require("./routes/quizRoutes");

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
app.use("/query", authenticateToken, queryRouter);
app.use("/quiz", authenticateToken, quizRouter);

// app.listen(1111, () => console.log("Port connected"));

const rooms = {};

const roomSample = {
  quizId: "isroomid",
  pinCode: 134982,
  quizOwner: "userId",
  questions: [{ question: "What is 1+1?", queryType: "Multiple Choice", pointsType: 2, answerIndex: 0, answers: [], timer: 120 }],
  players: {},
  quizTitle: "Biology 101 Mid-Term Exam",
};

// Websocket Logic
io.on("connection", (socket) => {
  console.log("Client connected", socket.id);

  socket.on("roomInit", (data) => {
    // console.log(data);
    rooms[data.quizId] = { ...data, quizOwner: data.userId, started: false, currQuestNum: 0, roomTimer: null };
    console.log(rooms);
  });

  socket.on("playerJoinRequest", async ({ quizId, pin, name }) => {
    if (!rooms[quizId]) {
      // socket.emit("alerts", { msg: "Room does not exist" });
      return;
    }

    if (pin !== rooms[quizId].pinCode) {
      // socket.emit("alerts", { msg: "Incorrect PIN code" });
      return;
    } else if (pin === rooms[quizId].pinCode) {
      rooms[quizId].players[name] = { name: name, score: 0 };
      const newData = { roomId: rooms[quizId].quizId, players: rooms[quizId].players };

      console.log("newData:", newData);
      io.emit("current_players", newData);

      console.log("player joined successfully");
    }

    console.log(rooms);
  });

  socket.on("start_game", ({ userId, quizId }) => {
    if (rooms[quizId].quizOwner === userId) {
      rooms[quizId].started = true;
      io.emit("game_started", { quizId });
    }
  });

  socket.on("get_question", ({ userId, quizId }) => {
    console.log("GETQUESTION-START:", userId, quizId);
    if (rooms[quizId].quizOwner === userId) {
      io.emit("new_question", {
        quizId,
        players: rooms[quizId].players,
        quizOwner: rooms[quizId].quizOwner,
        questionNum: rooms[quizId].currQuestNum + 1,
        question: rooms[quizId].questions[rooms[quizId].currQuestNum].question,
        queryType: rooms[quizId].questions[rooms[quizId].currQuestNum].queryType,
        timer: rooms[quizId].questions[rooms[quizId].currQuestNum].timer,
        answers: rooms[quizId].questions[rooms[quizId].currQuestNum].answers,
      });
      let time = rooms[quizId].questions[rooms[quizId].currQuestNum].timer + 1;

      let countdown = setInterval(() => {
        time--;
        io.emit("timerUpdate", { quizId, newTime: time });
        if (time <= 0) {
          clearInterval(countdown);
        }
      }, 1000);

      socket.on("earlyTimerClear", ({ userId, quizId }) => {
        if (rooms[quizId].quizOwner === userId) {
          time = 0;
          clearInterval(countdown);
        }
      });

      if (time <= 0) {
        io.emit("timer_up", { quizId, aIdx: rooms[quizId].questions[rooms[quizId].currQuestNum].answerIndex });

        setTimeout(() => {
          if (rooms[quizId].currQuestNum + 1 < rooms[quizId].questions.length) {
            rooms[quizId].currQuestNum += 1;
            io.emit("next_query_ready", { quizId });
          } else {
            io.emit("gameover");
          }
        }, 10000);
      }
    } else {
      // socket.emit("alerts", { msg: "Room does not exist" });
      return;
    }
  }),
    socket.on("disconnect", () => console.log("Client disconnected"));
});
