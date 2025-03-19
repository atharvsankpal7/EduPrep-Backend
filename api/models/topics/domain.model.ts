import mongoose, { Schema } from "mongoose";
import { IDomain } from "../../types/databaseSchema.types";

const DomainSchema = new Schema<IDomain>(
  {
    domainName: { type: String, required: true },
    educationLevel: { type: String, required: true },
  },
  { timestamps: true }
);

export const Domain = mongoose.model<IDomain>("Domain", DomainSchema);
