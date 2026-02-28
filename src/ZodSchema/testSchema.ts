import { z } from "zod";

const customTestSchema = z.object({
  time: z
    .coerce.number()
    .int("Test duration must be a whole number of minutes")
    .transform((value) => (value >= 900 && value % 60 === 0 ? value / 60 : value))
    .pipe(
      z
        .number()
        .min(1, "Test duration must be at least 1 minute")
        .max(720, "Test duration cannot exceed 720 minutes")
    ),
  numberOfQuestions: z
    .coerce.number()
    .int("Number of questions must be a whole number")
    .positive("Number of questions must be positive"),
  topicList: z.array(
    z.string().min(1, "Topic name must be at least 1 character long")
  ),

  // educationLevel: z.enum(["undergraduate", "juniorCollege"]),
});
export { customTestSchema };

export const testIdParamsSchema = z.object({
  id: z.string().uuid("Invalid test id"),
});

export const resultIdParamsSchema = z.object({
  resultId: z.string().uuid("Invalid result id"),
});

export const companyNameParamsSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required"),
});

export const submitTestBodySchema = z.object({
  selectedAnswers: z
    .array(
      z.object({
        questionId: z.string().uuid("Invalid question id"),
        selectedOption: z.coerce.number().int().min(-1, "selectedOption must be at least -1").max(4),
        sectionName: z.string().optional(),
      })
    )
    .min(1, "Answers are required and must be an array"),
  timeTaken: z.coerce.number().int().nonnegative("timeTaken must be non-negative"),
  autoSubmission: z
    .object({
      isAutoSubmitted: z.coerce.boolean().default(false),
      tabSwitches: z.coerce.number().int().nonnegative().default(0),
    })
    .default({ isAutoSubmitted: false, tabSwitches: 0 }),
});
