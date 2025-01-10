import express from "express";
import {loginUser, logoutUser, registerStudent, refreshAccessToken} from "../controllers/student.controller.ts";
import {authMiddleware} from "../middleware/auth.middleware.ts";

const router = express.Router();

router.route("/register").post(registerStudent)
router.route("/login").post(loginUser)
router.route("/logout").post(authMiddleware,logoutUser)
router.route("/refresh").post(refreshAccessToken)

export default router;