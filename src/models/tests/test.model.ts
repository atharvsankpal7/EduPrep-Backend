import mongoose, {Schema} from "mongoose";
import {ITest} from "../../types/databaseSchema.types";

const TestSchema = new Schema<ITest>(
    {
        testName: {type: String, required: true},
        testDuration: {type: Number, required: true},
        totalQuestions: {type: Number, required: true},
        expiryTime: {type: Date, required: false},
        testQuestions: [{type: Schema.Types.ObjectId, ref: "Question", required: true}],
        createdBy: {type: Schema.Types.ObjectId, ref: "User", required: true},
    },
    {timestamps: true}
);
export const Test = mongoose.model<ITest>("Test", TestSchema);
