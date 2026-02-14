import { z } from "zod";

const baseUserSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(64, "Password length should be less than 64"),
});

export const userRegistrationSchema = baseUserSchema.extend({
  // urn: z.number().int().positive(),
});

export const userLoginSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  // urn: z
  //   .union([z.string(), z.number()])
  //   .refine((val) => val.toString().length >= 8, {
  //     message: "Enter valid URN",
  //   })
  //   .transform((val) => val.toString())
  //   .optional(),
});

export const createAdminSchema = baseUserSchema;
