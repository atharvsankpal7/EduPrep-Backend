import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { uploadMiddleware } from "../middleware/multer.middleware.ts";
import { saveExcel } from "../controllers/question.controller.ts";
const router = express.Router();

router
  .route("/uploadExcel")
  .post(authMiddleware, uploadMiddleware.single("file"), saveExcel);

export default router;
