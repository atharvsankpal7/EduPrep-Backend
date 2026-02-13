import { z } from "zod";

const customTestSchema = z.object({
  time: z
    .number()
    .int("Test duration must be a whole number of minutes")
    .min(1, "Test duration must be at least 1 minute")
    .max(720, "Test duration cannot exceed 720 minutes"),
  numberOfQuestions: z
    .number()
    .int("Number of questions must be a whole number")
    .positive("Number of questions must be positive"),
  topicList: z.array(
    z.string().min(1, "Topic name must be at least 1 character long")
  ),

  // educationLevel: z.enum(["undergraduate", "juniorCollege"]),
});
export { customTestSchema };
