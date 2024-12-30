import mongoose, { Schema } from "mongoose";
import { ITopic } from "../../types/databaseSchema.types";

const TopicSchema = new Schema<ITopic>(
  {
    topicName: { type: String, required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
  },
  { timestamps: true } 
);
export const Topic = mongoose.model<ITopic>("Topic", TopicSchema);
