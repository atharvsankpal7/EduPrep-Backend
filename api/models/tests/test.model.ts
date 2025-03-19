import mongoose, {Schema} from "mongoose";
import {ITest, ITestSection} from "../../types/databaseSchema.types";

const TestSectionSchema = new Schema<ITestSection>({
        sectionName: {type: String, required: true},
        sectionDuration: {type: Number, required: true}, // in minutes
        questions: [{type: Schema.Types.ObjectId, ref: "Question", required: true}],
        totalQuestions: {type: Number, required: true}
});

const TestSchema = new Schema<ITest>(
    {
            testName: {type: String, required: true},
            sections: [TestSectionSchema],
            totalDuration: {type: Number, required: true}, // in minutes
            totalQuestions: {type: Number, required: true},
            expiryTime: {type: Date, required: false},
            createdBy: {type: Schema.Types.ObjectId, ref: "User", required: true},
    },
    {timestamps: true}
);

export const Test = mongoose.model<ITest>("Test", TestSchema);