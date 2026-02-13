import { User as DbUser } from "../db/schema";

declare global {
  namespace Express {
    interface User extends Omit<DbUser, "password" | "refreshToken"> {}
  }
}

export {};
