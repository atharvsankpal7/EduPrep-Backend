import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto';

export const MIME_TYPE_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/csv': '.csv'
};

export const generateFilename = (req: any, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
  const extension = MIME_TYPE_MAP[file.mimetype];
  if (!extension) {
    return cb(new Error('Invalid mime type'), '');
  }
  const filename = `${crypto.randomUUID()}${extension}`;
  cb(null, filename);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: generateFilename
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = Object.keys(MIME_TYPE_MAP);

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, Excel and CSV files are allowed.'));
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
