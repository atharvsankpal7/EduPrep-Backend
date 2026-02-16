import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { ApiError } from "./ApiError";
import { findUserByEmail } from "../db/helpers/user.helpers";
import { comparePassword } from "../db/helpers/auth.helpers";

// Pre-computed hash for timing attack mitigation
const DUMMY_HASH = '$2b$10$ORrrZLv6dm/h90DsyxSZquN9i0HTDJMthfO74WdBxkNNdS9RMgeei';

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email: string, password: string, done: any) => {
      try {
        if (!email || !password) {
          return done(new ApiError(400, "Email and password are required"));
        }

        const user = await findUserByEmail(email);

        // Constant-time comparison: always compare password, even if user not found
        const passwordToCompare = user ? user.password : DUMMY_HASH;
        const isPasswordCorrect = await comparePassword(password, passwordToCompare);

        // If user is not found OR password is not correct, return generic error
        if (!user || !isPasswordCorrect) {
          return done(new ApiError(401, "Invalid email or password"));
        }

        const loggedInUser: Express.User = {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };

        return done(null, loggedInUser);
      } catch (error) {
        return done(error);
      }
    }
  )
);

export default passport;
