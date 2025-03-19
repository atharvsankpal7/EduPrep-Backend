import mongoose, {Schema} from "mongoose";
import {ICompanySpecificTestDetails} from "../../types/databaseSchema.types";

const CompanySpecificTestDetailsSchema = new Schema<ICompanySpecificTestDetails>(
    {
        companyName: {type: String, required: true, index:true},
        topicList: [{type: Schema.Types.ObjectId, ref: "Topic", required: true}],
        time: {type: Number, required: true},
        numberOfQuestions: {type: Number, required: true},
    },
    {timestamps: true}
);
export const CompanySpecificTestDetails = mongoose.model<ICompanySpecificTestDetails>(
    "CompanySpecificTestDetails",
    CompanySpecificTestDetailsSchema
);