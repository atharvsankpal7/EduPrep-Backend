import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { IUser } from "../../types/databaseSchema.types.ts";

const userSchema = new Schema<IUser>(
  {
    urn: {
      type: Number,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      default: "student",
      enum: ["student", "admin"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Middleware function that is executed before saving a User document to the database.
 * This function hashes the user's password using bcrypt before saving the document.
 */
userSchema.pre<IUser>("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Compares the provided password with the user's hashed password and returns a boolean indicating if the passwords match.
 */
userSchema.methods.isPasswordCorrect = async function (
  this: IUser,
  password: string
): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

/**
 * Generates a JWT access token for the user.
 * The token contains the user's _id, email, username, and fullName.
 * The token expires after the duration specified by the ACCESS_TOKEN_EXPIRY environment variable.
 * @returns {string} The generated access token.
 */
userSchema.methods.generateAccessToken = function (this: IUser): string {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      fullName: this.fullName,
      urn: this.urn,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET as string
  );
};

/**
 * Generates a JWT refresh token for the user.
 * The token contains the user's _id.
 * The token expires after the duration specified by the REFRESH_TOKEN_EXPIRY environment variable.
 * @returns {string} The generated refresh token.
 */
userSchema.methods.generateRefreshToken = function (this: IUser): string {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET as string
  );
};

export const User = mongoose.model<IUser>("User", userSchema);