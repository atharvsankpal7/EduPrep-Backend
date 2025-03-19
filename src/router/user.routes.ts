import express from "express";
import {loginUser, logoutUser, refreshAccessToken, registerStudent} from "../controllers/student.controller";
import {authMiddleware} from "../middleware/auth.middleware";

const router = express.Router();

router.route("/register").post(registerStudent)
router.route("/login").post(loginUser)
router.route("/logout").post(authMiddleware,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

export default router;