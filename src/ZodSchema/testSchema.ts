import { z } from "zod";

const customTestSchema = z.object({
  time: z.number().positive("Test duration must be positive"),
  numberOfQuestions: z
    .number()
    .positive("Number of questions must be positive"),
  topicList: z.array(
    z.string().min(1, "Topic name must be at least 1 character long")
  ),

  // educationLevel: z.enum(["undergraduate", "juniorCollege"]),
});
export { customTestSchema };
