import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Map MIME types to allowed extensions
const ALLOWED_MIME_TYPES: { [key: string]: string[] } = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
};

export const destinationHandler = (req: Express.Request, file: Express.Multer.File, cb: any) => {
    const uploadDir = 'uploads/';
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
};

export const filenameGenerator = (req: Express.Request, file: Express.Multer.File, cb: any) => {
    const uniqueSuffix = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
};

export const storage = multer.diskStorage({
  destination: destinationHandler,
  filename: filenameGenerator
});

export const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = ALLOWED_MIME_TYPES[file.mimetype];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type or extension. Allowed types: JPEG, PNG, GIF, Excel, CSV`));
  }
};

const limits = {
  fileSize: 50 * 1024 * 1024, // 50MB max file size
  files: 1 // Allow only 1 file per upload
};

export const uploadMiddleware = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: limits
});
