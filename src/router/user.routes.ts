import express from "express";
import {getUser, loginUser, logoutUser, registerStudent} from "../controllers/student.controller";
import {authMiddleware} from "../middleware/auth.middleware";

const router = express.Router();

router.route("/register").post(registerStudent)
router.route("/login").post(loginUser)
router.route("/logout").post(authMiddleware,logoutUser)
router.route("/me").get(authMiddleware,getUser)
export default router;