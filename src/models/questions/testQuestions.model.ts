import mongoose, { Schema } from "mongoose";
import { ITestQuestion } from "../../types/databaseSchema.types";

const TestQuestionSchema = new Schema<ITestQuestion>(
  {
    testId: { type: Schema.Types.ObjectId, ref: "Test", required: true },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

export const TestQuestion = mongoose.model<ITestQuestion>(
  "TestQuestion",
  TestQuestionSchema
);
