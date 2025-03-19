import { z } from "zod";

export const userRegistrationSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    urn: z.number().int().positive(),
    email: z.string().email("Invalid email format"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(64, "Password length should be less than 64"),
    city: z.string().min(1, "City is required").optional(),
    contactNumber: z
      .string()
      .min(10, "Contact number must be at least 10 digits")
      .max(15, "Contact number must be less than 15 digits")
      .optional(),
  })
  .passthrough();

export const userLoginSchema = z
  .object({
    email: z.string().email("Invalid email format").optional(),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    urn: z
      .union([z.string(), z.number()])
      .refine((val) => val.toString().length >= 8, {
        message: "Enter valid URN",
      })
      .transform((val) => val.toString())
      .optional(),
  })
  .strict()
  .refine((data) => data.email !== undefined || data.urn !== undefined, {
    message: "At least one of email or URN must be provided",
    path: ["email"], // Assigns the error to the email field for clarity
  });

export const createAdminSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(64, "Password length should be less than 64"),
});