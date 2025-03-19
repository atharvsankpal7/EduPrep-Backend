import mongoose, { Schema } from "mongoose";

interface ITopicDistribution {
  topicId: Schema.Types.ObjectId;
  topicName: string;
  questionCount: number;
  marksPerQuestion: number;
}

interface ISubjectDistribution {
  subject: string;
  standard: number;
  topics: ITopicDistribution[];
}

interface ICETDistribution extends mongoose.Document {
  distributions: ISubjectDistribution[];
}

const TopicDistributionSchema = new Schema<ITopicDistribution>({
  topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
  topicName: { type: String, required: true },
  questionCount: { type: Number, required: true },
  marksPerQuestion: { type: Number, required: true, default: 1 }
});

const SubjectDistributionSchema = new Schema<ISubjectDistribution>({
  subject: { type: String, required: true },
  standard: { type: Number, required: true },
  topics: [TopicDistributionSchema]
});

const CETDistributionSchema = new Schema<ICETDistribution>({
  distributions: [SubjectDistributionSchema]
});

export const CETDistribution = mongoose.model<ICETDistribution>("CETDistribution", CETDistributionSchema);