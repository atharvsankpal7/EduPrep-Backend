import mongoose, {Schema} from "mongoose";
import {ITestResult} from "../../types/databaseSchema.types";

const TestResultSchema = new Schema<ITestResult>(
    {
        testId: {type: Schema.Types.ObjectId, ref: "Test", required: true, index: true},
        studentId: {type: Schema.Types.ObjectId, ref: "User", required: true, index: true},
        score: {type: Number, required: true},
        timeTaken: {type: Number, required: true},
        selectedAnswers: [
            {
                questionId: {
                    type: Schema.Types.ObjectId,
                    ref: "Question",
                    required: true,
                },
                selectedOption: {type: Number, required: true},
            },
        ],
        autoSubmission: {
            isAutoSubmitted: {type: Boolean},
            tabSwitches: {type: Number},
        },
    },
    {timestamps: true}
);

export const TestResult = mongoose.model<ITestResult>(
    "TestResult",
    TestResultSchema
);
