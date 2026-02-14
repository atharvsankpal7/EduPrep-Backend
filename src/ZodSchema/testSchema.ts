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
    z.coerce
      .number({ invalid_type_error: "Topic ID must be a number" })
      .int("Topic ID must be an integer")
      .positive("Topic ID must be positive")
  ),

  // educationLevel: z.enum(["undergraduate", "juniorCollege"]),
});
export { customTestSchema };
