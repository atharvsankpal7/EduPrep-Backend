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
    correctOption: number;
    difficultyLevel?: number;
    explanation?: string;

}

export enum DifficultyLevel {
    EASY = 1,
    MEDIUM = 2,
    HARD = 3,
}

export interface ITest extends mongoose.Document {
    testName: string;
    testDuration: number;
    totalQuestions: number;
    expiryTime: Date;
    testQuestions: Schema.Types.ObjectId[]; // questionId
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