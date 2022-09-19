const mongoose = require("mongoose");
const QRCode = require("qrcode");
const { customAlphabet } = require("nanoid");

const quizSchema = new mongoose.Schema(
  {
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    queries: [{ type: mongoose.Schema.Types.ObjectId, ref: "Query" }],
    qrString: { type: String },
    pinCode: { type: Number },
  },
  { timestamps: true }
);

quizSchema.pre("save", async function (next) {
  const URL = `${process.env.BASE_URL}/play/${this._id}`;
  const nanoid = customAlphabet("123456789", 6);

  this.pinCode = await Number(nanoid());

  QRCode.toString(URL, { type: "svg" }, (err, string) => {
    if (err) throw err;
    const qrString = string;

    this.qrString = qrString;
    next();
  });
});

const QuizModel = mongoose.model("Quiz", quizSchema);

module.exports = QuizModel;
