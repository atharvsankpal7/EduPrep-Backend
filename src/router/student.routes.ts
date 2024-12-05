import express from "express";
import {loginStudent, logoutUser, registerStudent} from "../controllers/student.controller.ts";
import {verifyToken} from "../middleware/auth.middleware.ts";

const router = express.Router();

router.route("/register").post(registerStudent)
router.route("/login").post(loginStudent)
router.route("/logout").get(verifyToken,logoutUser)

export default router;
