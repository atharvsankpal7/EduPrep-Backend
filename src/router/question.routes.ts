import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { adminMiddleware } from "../middleware/admin.middleware";
import { uploadMiddleware } from "../middleware/multer.middleware";
import { saveExcel } from "../controllers/question.controller";
const router = express.Router();

router
  .route("/uploadExcel")
  .post(authMiddleware, adminMiddleware, uploadMiddleware.single("file"), saveExcel);

export default router;
