import { Schema, model } from 'mongoose';

interface ITest {
  id: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const testSchema = new Schema<ITest>({
  id: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
    password: {
      type: String,
        required: true,
    }
}, {
  timestamps: true,
  versionKey: false
});

export const Test = model<ITest>('Test', testSchema);
