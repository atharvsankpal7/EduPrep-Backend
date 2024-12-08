import { TopicList, EducationLevel } from './sharedTypes';

export interface CreateTestResponse {
  testId: string;
  message: string;
}

export interface CustomTestParams {
  time: number;
  numberOfQuestions: number;
  topicList: TopicList;
  educationLevel: EducationLevel;
}

export interface CompanyTestParams {
  company: string;
  educationLevel: EducationLevel;
}

export type TestType = 'GATE' | 'CET' | 'COMPANY_SPECIFIC' | 'CUSTOM';