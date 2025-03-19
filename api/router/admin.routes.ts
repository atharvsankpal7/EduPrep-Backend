import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { adminMiddleware } from "../middleware/admin.middleware";
import {
  getAllStudents,
  createAdmin,
  getStudentDetails,
} from "../controllers/admin.controller";

const router = express.Router();

// Protect all admin routes with authentication and admin middleware
router.use(authMiddleware, adminMiddleware);

// Admin routes
router.get("/students", getAllStudents);
router.post("/create", createAdmin);
router.get("/students/:studentId", getStudentDetails);

export default router;