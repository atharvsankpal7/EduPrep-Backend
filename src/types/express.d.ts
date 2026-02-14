import { User as DbUser } from "../db/schema";

declare global {
  namespace Express {
    interface Request {
      loggedInUser: Express.User;
    }

    interface User extends Omit<DbUser, "password" | "refreshToken"> {}
  }
}

export {};
