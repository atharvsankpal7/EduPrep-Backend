import { z } from "zod";

export const ExcelRowSchema = z.object({
    question: z.string().min(1, "Question is required"),
    option_1: z
        .union([z.string(), z.number().transform(String)])
        .pipe(z.string().min(1, "Option 1 is required")),
    option_2: z
        .union([z.string(), z.number().transform(String)])
        .pipe(z.string().min(1, "Option 2 is required")),
    option_3: z
        .union([z.string(), z.number().transform(String)])
        .pipe(z.string().min(1, "Option 3 is required")),
    option_4: z
        .union([z.string(), z.number().transform(String)])
        .pipe(z.string().min(1, "Option 4 is required")),
    answer: z.number().min(1, "Answer is required"),
    subject: z.string().min(1, "Subject is required").transform(str => str.toLowerCase()),
    topics: z.string().min(1, "Topics are required").transform(str => str.toLowerCase()),
    standard: z.number().min(1, "Standard is required"),
    explanation: z.string().optional().default("")
});