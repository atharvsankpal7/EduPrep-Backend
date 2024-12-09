import {z} from "zod";

export const userRegistrationSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    urn: z.number().min(8, "Enter valid URN"),
    email: z.string().email("Invalid email format"),
    password: z.string()
        .min(8, "Password must be at least 8 characters long")
        .max(64, "Password length should be less than 64"),
});

export const userLoginSchema = z.object({
    email: z.string().email("Invalid email format").optional(),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    urn: z.number().min(8, "Enter valid URN").optional(),
}).refine(data => !!(data.email || data.urn) && !(data.email && data.urn), {
    message: "Either email or URN must be provided, but not both"
});