export interface IUser {
  _id?: string;
  id: number;
  // urn: number;
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

export interface IDomain {
  _id?: string;
  domainName: string;
  educationLevel: string;
}

export interface ISubject {
  _id?: string;
  subjectName: string;
  domainId: number;
}

export interface ITopic {
  _id?: string;
  topicName: string;
  subjectId: number;
}

export interface IQuestion {
  _id?: string;
  topicId: number;
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
  questions: string[]; // questionIds for this section
  totalQuestions: number;
}

export interface ITest {
  _id?: string;
  testName: string;
  sections: ITestSection[];
  totalDuration: number; // total duration in minutes (sum of all section durations)
  totalQuestions: number; // total questions across all sections
  expiryTime: Date;
  createdBy: number; // userId
}

export interface ITestResult {
  _id?: string;
  testId: string;
  studentId: number; // the student who gave the test
  score: number;
  timeTaken: number; // in seconds
  selectedAnswers: {
    questionId: string;
    selectedOption: number;
    sectionName: string; // Added to track which section the answer belongs to
  }[];
  autoSubmission: {
    isAutoSubmitted: boolean;
    tabSwitches: number;
  };
  createdAt: Date;
}

export interface ICompanySpecificTestDetails {
  _id?: string;
  companyName: string;
  time: number;
  numberOfQuestions: number;
  topicList: string[];
}
