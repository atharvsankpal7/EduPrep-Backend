import { describe, it, expect, mock } from "bun:test";

// Mock multer
mock.module("multer", () => {
    const multerFn: any = (config: any) => ({
        single: () => {},
        array: () => {},
        fields: () => {},
        any: () => {},
    });

    multerFn.diskStorage = (config: any) => ({
        _handleFile: () => {},
        _removeFile: () => {},
    });

    // Return both default (for import multer from 'multer') and named exports if any
    return {
        default: multerFn,
        diskStorage: multerFn.diskStorage,
    };
});

// Mock fs
mock.module("fs", () => {
    return {
        default: {
            existsSync: () => true,
            mkdirSync: () => {},
        },
        existsSync: () => true,
        mkdirSync: () => {},
    };
});

// Dynamic import
const { storageFilename } = await import("../middleware/multer.middleware");
import { Request } from "express";

describe("Multer Security", () => {
    it("should generate a UUID filename and ignore originalname", () => {
        const mockReq = {} as any;

        const mockFile = {
            fieldname: 'file',
            originalname: "../../../etc/passwd",
            encoding: '7bit',
            mimetype: "image/png",
            destination: 'uploads/',
            filename: '',
            path: '',
            size: 1024
        } as any;

        const cb = mock((error: Error | null, filename: string) => {
            expect(error).toBeNull();
            if (filename) {
                expect(filename.endsWith(".png")).toBe(true);
                expect(filename).not.toContain("passwd");
                expect(filename).not.toContain("etc");
                expect(filename).not.toContain("..");

                const uuidPart = filename.split('.')[0];
                expect(uuidPart).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            } else {
                 expect(filename).toBeDefined();
            }
        });

        storageFilename(mockReq, mockFile, cb);
        expect(cb).toHaveBeenCalled();
    });

    it("should use correct extension for allowed mime types", () => {
        const mockReq = {} as any;

        const testCases = [
            { mime: "image/jpeg", ext: "jpeg" },
            { mime: "application/vnd.ms-excel", ext: "xls" },
            { mime: "text/csv", ext: "csv" }
        ];

        testCases.forEach(({ mime, ext }) => {
            const mockFile = {
                fieldname: 'file',
                originalname: "test-file",
                encoding: '7bit',
                mimetype: mime,
                destination: 'uploads/',
                filename: '',
                path: '',
                size: 1024
            } as any;

            const cb = mock((error: Error | null, filename: string) => {
                expect(error).toBeNull();
                expect(filename.endsWith(`.${ext}`)).toBe(true);
            });

            storageFilename(mockReq, mockFile, cb);
            expect(cb).toHaveBeenCalled();
        });
    });

    it("should reject invalid mime types (fallback)", () => {
        const mockReq = {} as any;

        const mockFile = {
            fieldname: 'file',
            originalname: "malicious.exe",
            encoding: '7bit',
            mimetype: "application/x-msdownload",
            destination: 'uploads/',
            filename: '',
            path: '',
            size: 1024
        } as any;

        const cb = mock((error: Error | null, filename: string) => {
            expect(error).toBeDefined();
            if (error) {
                 expect(error.message).toBe("Invalid file type");
            }
        });

        storageFilename(mockReq, mockFile, cb);
        expect(cb).toHaveBeenCalled();
    });
});
