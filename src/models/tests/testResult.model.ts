import mongoose, { Schema } from "mongoose";
import { ITestResult } from "../../types/databaseSchema.types";

const TestResultSchema = new Schema<ITestResult>(
  {
    testId: { type: Schema.Types.ObjectId, ref: "Test", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    score: { type: Number, required: true },
    timeTaken: { type: Number, required: true },
    selectedAnswers: [
      {
        questionId: {
          type: Schema.Types.ObjectId,
          ref: "Question",
          required: true,
        },
        selectedOption: { type: Number, required: true },
      },
    ],
    autoSubmission: {
      isAutoSubmitted: { type: Boolean, required: true },
      tabSwitches: { type: Number, required: true },
    },
  },
  { timestamps: true }
);

export const TestResult = mongoose.model<ITestResult>(
  "TestResult",
  TestResultSchema
);
