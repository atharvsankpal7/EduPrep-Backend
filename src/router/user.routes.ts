import express from "express";
import {getUser, loginUser, logoutUser, registerStudent} from "../controllers/student.controller";
import {authMiddleware} from "../middleware/auth.middleware";
import passport from "../utils/passport";

const router = express.Router();

router.route("/register").post(registerStudent)
router.route("/login").post(passport.authenticate("local", { session: false }), loginUser)
router.route("/logout").post(authMiddleware,logoutUser)
router.route("/me").get(authMiddleware,getUser)
export default router;
