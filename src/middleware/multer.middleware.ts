import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';

export const MIME_TYPE_MAP: { [key: string]: string } = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/gif': 'gif',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/csv': 'csv'
};

export const storageDestination = (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = 'uploads/';
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
};

export const storageFilename = (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const ext = MIME_TYPE_MAP[file.mimetype];
    if (ext) {
        cb(null, `${crypto.randomUUID()}.${ext}`);
    } else {
        // Fallback for safety, though fileFilter should catch this.
        cb(new Error('Invalid file type'), '');
    }
};

const storage = multer.diskStorage({
  destination: storageDestination,
  filename: storageFilename
});

export const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = Object.keys(MIME_TYPE_MAP);

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, Excel and CSV files are allowed.'));
  }
};

export const limits = {
  fileSize: 50 * 1024 * 1024, // 50MB max file size
  files: 1 // Allow only 1 file per upload
};

export const uploadMiddleware = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: limits
});
