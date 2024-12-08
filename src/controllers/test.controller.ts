import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { testService } from '../services/test.service';
import { ApiError } from '../utils/ApiError';
import ApiResponse from '../utils/ApiResponse';
import { z } from 'zod';
import logger from '../utils/logger';

// Validation schemas
const customTestSchema = z.object({
  time: z.number().positive('Test duration must be positive'),
  numberOfQuestions: z.number().positive('Number of questions must be positive'),
  topicList: z.object({
    subjects: z.array(z.object({
      subjectName: z.string(),
      topics: z.array(z.string())
    })).min(1, 'At least one subject is required')
  }),
  educationLevel: z.enum(['undergraduate', 'juniorCollege'])
});

const companyTestSchema = z.object({
  company: z.string().min(1, 'Company name is required'),
  educationLevel: z.enum(['undergraduate', 'juniorCollege'])
});

export const createGateTest = asyncHandler(async (req: Request, res: Response) => {
  const { educationLevel } = req.params;
  
  if (educationLevel !== 'undergraduate') {
    throw new ApiError(400, 'GATE tests are only available for undergraduate level');
  }

  const result = await testService.createGateTest(educationLevel);
  
  res.status(201).json(
    new ApiResponse(201, result, 'GATE test created successfully')
  );
});

export const createCompanyTest = asyncHandler(async (req: Request, res: Response) => {
  const parsed = companyTestSchema.safeParse(req.body);
  
  if (!parsed.success) {
    logger.warn('Validation failed for company test creation', parsed.error);
    throw new ApiError(400, 'Invalid input', parsed.error.errors);
  }

  const result = await testService.createCompanyTest(parsed.data);
  
  res.status(201).json(
    new ApiResponse(201, result, 'Company specific test created successfully')
  );
});

export const createCETTest = asyncHandler(async (req: Request, res: Response) => {
  const { educationLevel } = req.params;
  
  if (educationLevel !== 'juniorCollege') {
    throw new ApiError(400, 'CET tests are only available for junior college level');
  }

  const result = await testService.createCETTest(educationLevel);
  
  res.status(201).json(
    new ApiResponse(201, result, 'CET test created successfully')
  );
});

export const createCustomTest = asyncHandler(async (req: Request, res: Response) => {
  const parsed = customTestSchema.safeParse(req.body);
  
  if (!parsed.success) {
    logger.warn('Validation failed for custom test creation', parsed.error);
    throw new ApiError(400, 'Invalid input', parsed.error.errors);
  }

  const result = await testService.createCustomTest(parsed.data);
  
  res.status(201).json(
    new ApiResponse(201, result, 'Custom test created successfully')
  );
});