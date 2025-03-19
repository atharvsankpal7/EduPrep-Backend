import mongoose, { Schema } from "mongoose";
import { ISubject } from "../../types/databaseSchema.types";

const SubjectSchema = new Schema<ISubject>(
    {
      subjectName: { type: String, required: true },
      domainId: { type: Schema.Types.ObjectId, ref: "Domain", required: true },
    },
    { timestamps: true }
  );
  
  export const Subject = mongoose.model<ISubject>("Subject", SubjectSchema);