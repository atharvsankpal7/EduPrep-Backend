import { z } from "zod";
import { ApiError } from "./ApiError";

export function validateType<T extends z.ZodTypeAny>(
  schema: T,
  object_: unknown
): z.infer<T> {
  try {
    return schema.parse(object_) as z.infer<T>;
  } catch (err: unknown) {
    throw new ApiError(
      400,
      err instanceof Error ? err.message : "Unable to validate the expected schema",
      err instanceof z.ZodError ? err.issues : [],
      err instanceof Error ? err.stack : ""
    );
  }
}
