import { expect, test, describe } from "bun:test";
import { uploadMiddleware } from "../../src/middleware/multer.middleware";
import type { Request } from 'express';
import path from 'path';

describe("Multer Middleware", () => {
    test("filename should be a valid UUID with original extension", () => {
        const storage = (uploadMiddleware as any).storage;
        const getFilename = storage.getFilename;

        const req = {} as Request;
        const file = {
            originalname: "test-file.png",
            mimetype: "image/png"
        } as Express.Multer.File;

        let resultFilename = "";
        const cb = (_err: any, filename: string) => {
            resultFilename = filename;
        };

        getFilename(req, file, cb);

        expect(resultFilename).not.toBeNull();
        expect(resultFilename.endsWith(".png")).toBe(true);
        expect(resultFilename).not.toContain("test-file"); // Should not contain original name

        // Basic UUID format check (8-4-4-4-12)
        const uuidPart = resultFilename.slice(0, -4); // Remove .png
        expect(uuidPart.length).toBe(36);
        expect(uuidPart).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    test("filename should not allow path traversal characters", () => {
        const storage = (uploadMiddleware as any).storage;
        const getFilename = storage.getFilename;

        const req = {} as Request;
        const file = {
            originalname: "../../etc/passwd",
            mimetype: "text/plain"
        } as Express.Multer.File;

        let resultFilename = "";
        const cb = (_err: any, filename: string) => {
            resultFilename = filename;
        };

        getFilename(req, file, cb);

        expect(resultFilename).not.toContain("../");
        expect(resultFilename).not.toContain("passwd");
        // Since no extension provided in original name, verify it's just UUID
        expect(resultFilename.length).toBe(36);
    });

    test("filename should handle complex extensions correctly", () => {
        const storage = (uploadMiddleware as any).storage;
        const getFilename = storage.getFilename;

        const req = {} as Request;
        const file = {
            originalname: "my.archive.tar.gz",
            mimetype: "application/gzip"
        } as Express.Multer.File;

        let resultFilename = "";
        const cb = (_err: any, filename: string) => {
            resultFilename = filename;
        };

        getFilename(req, file, cb);

        // path.extname returns only the last extension
        expect(resultFilename.endsWith(".gz")).toBe(true);
        expect(resultFilename).not.toContain("my.archive.tar");
    });
});
