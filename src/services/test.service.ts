import { TopicList, EducationLevel } from '../types/sharedTypes';
import { CustomTestParams, CompanyTestParams, CreateTestResponse } from '../types/test.types';
import { Test } from '../models/tests/test.model';
import { ApiError } from '../utils/ApiError';
import logger from '../utils/logger';

class TestService {
  private async getTopicsForTest(testType: string, company?: string): Promise<string[]> {
    // This would typically fetch from a database based on test type
    switch (testType) {
      case 'GATE':
        return ['Data Structures', 'Algorithms', 'Operating Systems', 'Database Management'];
      case 'CET':
        return ['Mathematics', 'Physics', 'Chemistry'];
      case 'COMPANY_SPECIFIC':
        if (!company) throw new ApiError(400, 'Company name is required for company specific tests');
        return ['Programming', 'System Design', 'Problem Solving'];
      default:
        return [];
    }
  }

  private async validateTestParams(params: CustomTestParams): Promise<void> {
    if (params.time <= 0) throw new ApiError(400, 'Test duration must be positive');
    if (params.numberOfQuestions <= 0) throw new ApiError(400, 'Number of questions must be positive');
    if (!params.topicList?.subjects?.length) throw new ApiError(400, 'Topic list cannot be empty');
  }

  async createGateTest(educationLevel: EducationLevel): Promise<CreateTestResponse> {
    try {
      const topics = await this.getTopicsForTest('GATE');
      const test = await Test.create({
        testName: 'GATE Practice Test',
        testDuration: 10800, // 3 hours in seconds
        totalQuestions: 65,
        expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        createdBy: 'system'
      });

      logger.info(`Created GATE test with ID: ${test._id}`);
      return {
        testId: test._id.toString(),
        message: 'GATE test created successfully'
      };
    } catch (error) {
      logger.error('Error creating GATE test:', error);
      throw new ApiError(500, 'Failed to create GATE test');
    }
  }

  async createCompanyTest(params: CompanyTestParams): Promise<CreateTestResponse> {
    try {
      const topics = await this.getTopicsForTest('COMPANY_SPECIFIC', params.company);
      const test = await Test.create({
        testName: `${params.company} Assessment`,
        testDuration: 7200, // 2 hours in seconds
        totalQuestions: 30,
        expiryTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
        createdBy: 'system'
      });

      logger.info(`Created company test for ${params.company} with ID: ${test._id}`);
      return {
        testId: test._id.toString(),
        message: `Company specific test for ${params.company} created successfully`
      };
    } catch (error) {
      logger.error('Error creating company test:', error);
      throw new ApiError(500, 'Failed to create company specific test');
    }
  }

  async createCETTest(educationLevel: EducationLevel): Promise<CreateTestResponse> {
    try {
      const topics = await this.getTopicsForTest('CET');
      const test = await Test.create({
        testName: 'CET Practice Test',
        testDuration: 7200, // 2 hours in seconds
        totalQuestions: 100,
        expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        createdBy: 'system'
      });

      logger.info(`Created CET test with ID: ${test._id}`);
      return {
        testId: test._id.toString(),
        message: 'CET test created successfully'
      };
    } catch (error) {
      logger.error('Error creating CET test:', error);
      throw new ApiError(500, 'Failed to create CET test');
    }
  }

  async createCustomTest(params: CustomTestParams): Promise<CreateTestResponse> {
    try {
      await this.validateTestParams(params);
      
      const test = await Test.create({
        testName: 'Custom Practice Test',
        testDuration: params.time,
        totalQuestions: params.numberOfQuestions,
        expiryTime: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours from now
        createdBy: 'system'
      });

      logger.info(`Created custom test with ID: ${test._id}`);
      return {
        testId: test._id.toString(),
        message: 'Custom test created successfully'
      };
    } catch (error) {
      logger.error('Error creating custom test:', error);
      throw new ApiError(500, 'Failed to create custom test');
    }
  }
}

export const testService = new TestService();