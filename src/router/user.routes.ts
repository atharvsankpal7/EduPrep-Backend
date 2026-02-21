import express from "express";
import {getUser, loginUser, logoutUser, registerStudent} from "../controllers/student.controller";
import {authMiddleware} from "../middleware/auth.middleware";
import passport from "../utils/passport";
import { authLimiter } from "../utils/raterLimiter";

const router = express.Router();

router.route("/register").post(authLimiter, registerStudent)
router
  .route("/login")
  .post(authLimiter, passport.authenticate("local", { session: false, userProperty: "loggedInUser" }), loginUser)
router.route("/logout").post(authMiddleware,logoutUser)
router.route("/me").get(authMiddleware,getUser)
export default router;
