import { z } from "zod";

export const subjectNameParamsSchema = z.object({
  subjectName: z.string().trim().min(1, "subjectName is required"),
});
