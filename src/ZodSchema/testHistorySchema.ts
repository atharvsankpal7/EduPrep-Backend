import { z } from "zod";

/**
 * Zod schema for GET /test-history query parameters.
 * All coercions are handled here so the controller stays trivial.
 */
export const testHistoryQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    testType: z
        .enum(["custom", "cet"])
        .optional(),
    search: z.string().trim().max(200).optional(),
    sortBy: z
        .enum(["attemptedAt", "score", "timeTaken"])
        .default("attemptedAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type TestHistoryQuery = z.infer<typeof testHistoryQuerySchema>;
