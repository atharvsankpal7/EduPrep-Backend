import multer from 'multer';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ];

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

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: limits
});

// Helper function to validate file signature
async function validateFile(filePath: string, mimeType: string): Promise<boolean> {
    let fd;
    try {
        fd = await fs.promises.open(filePath, 'r');
        const buffer = Buffer.alloc(8);
        await fd.read(buffer, 0, 8, 0);
        const hex = buffer.toString('hex').toUpperCase();

        if (mimeType === 'text/csv') {
             // Check first 1KB for null bytes and script tags
             const textBuffer = Buffer.alloc(1024);
             const { bytesRead } = await fd.read(textBuffer, 0, 1024, 0);
             const content = textBuffer.subarray(0, bytesRead);

             // Check for null bytes
             if (content.includes(0x00)) return false;

             // Check for common script tags
             const text = content.toString('utf8').toLowerCase();
             if (text.includes('<?php') || text.includes('<script') || text.includes('eval(')) {
                 return false;
             }
             return true;
        }

        switch (mimeType) {
            case 'image/jpeg':
                return hex.startsWith('FFD8FF');
            case 'image/png':
                return hex.startsWith('89504E470D0A1A0A');
            case 'image/gif':
                return hex.startsWith('47494638');
            case 'application/vnd.ms-excel':
                return hex.startsWith('D0CF11E0A1B11AE1');
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                return hex.startsWith('504B0304');
            default:
                return false;
        }
    } catch {
        return false;
    } finally {
        if (fd) await fd.close();
    }
}

const wrapMulterMiddleware = (middleware: (req: Request, res: Response, next: NextFunction) => void) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        middleware(req, res, async (err: any) => {
            if (err) return next(err);

            const filesToDelete: string[] = [];
            const addFileToDelete = (path: string) => {
                if (path && !filesToDelete.includes(path)) filesToDelete.push(path);
            };

            try {
                // Check req.file (single)
                if (req.file) {
                     addFileToDelete(req.file.path);
                     const isValid = await validateFile(req.file.path, req.file.mimetype);
                     if (!isValid) throw new Error('Invalid file content. Verification failed.');
                }

                // Check req.files (array or fields)
                if (req.files) {
                    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
                    for (const file of files) {
                         addFileToDelete(file.path);
                         const isValid = await validateFile(file.path, file.mimetype);
                         if (!isValid) throw new Error('Invalid file content. Verification failed.');
                    }
                }
                next();
            } catch (validationErr) {
                 // Cleanup all files uploaded in this request
                 await Promise.all(filesToDelete.map(path => fs.promises.unlink(path).catch(() => {})));
                 next(validationErr);
            }
        });
    }
}

// Wrapper middleware to enforce validation
export const uploadMiddleware = {
    ...upload,
    single: (fieldName: string) => wrapMulterMiddleware(upload.single(fieldName)),
    array: (fieldName: string, maxCount?: number) => wrapMulterMiddleware(upload.array(fieldName, maxCount)),
    fields: (fields: multer.Field[]) => wrapMulterMiddleware(upload.fields(fields)),
    any: () => wrapMulterMiddleware(upload.any()),
    none: upload.none.bind(upload)
};
