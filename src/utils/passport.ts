import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { ApiError } from "./ApiError";
import { findUserByEmail } from "../db/helpers/user.helpers";
import { comparePassword } from "../db/helpers/auth.helpers";

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
        if (!user) {
          return done(new ApiError(404, "User not found"));
        }

        const isPasswordCorrect = await comparePassword(password, user.password);
        if (!isPasswordCorrect) {
          return done(new ApiError(401, "Wrong password"));
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

export default passport;
