import { expect, test, describe, mock, beforeAll } from "bun:test";

describe("Multer Security", () => {
    let generateFilename: any;
    let MIME_TYPE_MAP: any;

    beforeAll(async () => {
        // Mock multer
        mock.module("multer", () => {
            const m = function() { return {}; };
            (m as any).diskStorage = () => {};
            return {
                default: m,
                diskStorage: () => {}
            };
        });

        // Mock fs
        mock.module("fs", () => {
            return {
                default: {
                    existsSync: () => true,
                    mkdirSync: () => {}
                },
                existsSync: () => true,
                mkdirSync: () => {}
            };
        });

        const mod = await import("../middleware/multer.middleware");
        generateFilename = mod.generateFilename;
        MIME_TYPE_MAP = mod.MIME_TYPE_MAP;
    });

    test("should generate a secure UUID filename with correct extension", (done) => {
        const req = {} as any;
        const file = {
            mimetype: "image/jpeg",
            originalname: "malicious.html.jpg"
        } as any;

        generateFilename(req, file, (err: any, filename: string) => {
            expect(err).toBeNull();
            expect(filename).toBeDefined();
            expect(filename.endsWith(".jpg")).toBe(true);
            expect(filename.length).toBe(36 + ".jpg".length);
            expect(filename).not.toContain("malicious");
            done();
        });
    });

    test("should handle all supported MIME types", (done) => {
        const mimeTypes = Object.keys(MIME_TYPE_MAP);
        let completed = 0;

        mimeTypes.forEach((mime) => {
            const req = {} as any;
            const file = {
                mimetype: mime,
                originalname: "test.file"
            } as any;

            generateFilename(req, file, (err: any, filename: string) => {
                expect(err).toBeNull();
                const ext = MIME_TYPE_MAP[mime];
                expect(filename.endsWith(ext)).toBe(true);
                expect(filename.length).toBe(36 + ext.length);
                completed++;
                if (completed === mimeTypes.length) {
                    done();
                }
            });
        });
    });

    test("should prevent path traversal attempts via originalname", (done) => {
        const req = {} as any;
        const file = {
            mimetype: "image/png",
            originalname: "../../etc/passwd"
        } as any;

        generateFilename(req, file, (err: any, filename: string) => {
            expect(err).toBeNull();
            expect(filename.endsWith(".png")).toBe(true);
            expect(filename).not.toContain("passwd");
            expect(filename).not.toContain("..");
            expect(filename).not.toContain("/");
            done();
        });
    });

    test("should return error for invalid mime type", (done) => {
        const req = {} as any;
        const file = {
            mimetype: "application/x-executable",
            originalname: "evil.exe"
        } as any;

        generateFilename(req, file, (err: any, filename: string) => {
            expect(err).toBeInstanceOf(Error);
            expect(filename).toBe("");
            done();
        });
    });
});
