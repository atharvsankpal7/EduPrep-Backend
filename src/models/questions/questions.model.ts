import mongoose, { Schema } from "mongoose";
import { DifficultyLevel, IQuestion } from "../../types/databaseSchema.types";

const QuestionSchema = new Schema<IQuestion>(
  {
    topicIds: [{ type: Schema.Types.ObjectId, ref: "Topic", required: true }],
    questionText: { type: String, required: true },
    options: { type: [String], required: true },
    correctOption: { type: Number, required: true },
    difficultyLevel: {
      type: Number,
      enum: Object.values(DifficultyLevel),
    },
    explanation: { type: String },
  },
  { timestamps: true }
);

export const Question = mongoose.model<IQuestion>("Question", QuestionSchema);
