import mongoose, {Schema} from "mongoose";

export interface IUser extends mongoose.Document {
  urn: number;
  email: string;
  fullName: string;
  password: string;
  refreshToken?: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;

  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

export interface IDomain extends mongoose.Document {
  domainName: string;
  educationLevel: string;
}

export interface ISubject extends mongoose.Document {
  subjectName: string;
  domainId: Schema.Types.ObjectId;
}

export interface ITopic extends mongoose.Document {
  topicName: string;
  subjectId: Schema.Types.ObjectId;
}

export interface IQuestion extends mongoose.Document {
  topicIds: Schema.Types.ObjectId[];
  questionText: string;
  options: string[];
  answer: number;
  difficultyLevel?: number;
  explanation?: string;
  standard: number;
}

export enum DifficultyLevel {
  EASY = 1,
  MEDIUM = 2,
  HARD = 3,
}

export interface ITestSection {
  sectionName: string;
  sectionDuration: number; // in minutes
  questions: Schema.Types.ObjectId[]; // questionIds for this section
  totalQuestions: number;
}

export interface ITest extends mongoose.Document {
  testName: string;
  sections: ITestSection[];
  totalDuration: number; // total duration in minutes (sum of all section durations)
  totalQuestions: number; // total questions across all sections
  expiryTime: Date;
  createdBy: Schema.Types.ObjectId; // userId
}

export interface ITestResult extends mongoose.Document {
  testId: Schema.Types.ObjectId;
  studentId: Schema.Types.ObjectId; // the student who gave the test
  score: number;
  timeTaken: number; // in seconds
  selectedAnswers: {
    questionId: Schema.Types.ObjectId;
    selectedOption: number;
    sectionName: string; // Added to track which section the answer belongs to
  }[];
  autoSubmission: {
    isAutoSubmitted: boolean;
    tabSwitches: number;
  };
}

export interface ICompanySpecificTestDetails extends mongoose.Document {
  companyName: string;
  time: number;
  numberOfQuestions: number;
  topicList: Schema.Types.ObjectId[];
}