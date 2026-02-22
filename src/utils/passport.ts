import passport from "passport";
import { Strategy as LocalStrategy, IVerifyOptions } from "passport-local";
import { ApiError } from "./ApiError";
import { findUserByEmail } from "../db/helpers/user.helpers";
import { comparePassword } from "../db/helpers/auth.helpers";

// Pre-generated hash for "dummy_password" to mitigate timing attacks
// generated with bcrypt.hash("dummy_password", 10)
const DUMMY_HASH = "$2b$10$c.SV3Tlh2OVN7xOjqN2Me.QI3cO2zFsz.t8ngK8zlVJdMdMqRFVuC";

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (
      email: string,
      password: string,
      done: (
        error: any,
        user?: Express.User | false,
        options?: IVerifyOptions
      ) => void
    ) => {
      try {
        if (!email || !password) {
          return done(new ApiError(400, "Email and password are required"));
        }

        const user = await findUserByEmail(email);

        // Use user's password hash if user exists, otherwise use dummy hash
        // This ensures the comparison operation always runs, mitigating timing attacks
        const passwordHash = user ? user.password : DUMMY_HASH;

        const isPasswordCorrect = await comparePassword(password, passwordHash);

        if (!user || !isPasswordCorrect) {
          // Generic error message prevents user enumeration
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
