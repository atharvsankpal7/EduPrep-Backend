import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import express from "express";
import { uploadMiddleware } from "../src/middleware/multer.middleware";
import fs from "fs";
import path from "path";

const app = express();
const port = 3457;
let server: any;

app.post("/upload", uploadMiddleware.single("file"), (req, res) => {
  res.status(200).send("File uploaded successfully");
});

app.use((err: any, req: any, res: any, next: any) => {
  res.status(500).send(err.message);
});

describe("Legitimate File Uploads", () => {
  beforeAll(() => {
    server = app.listen(port);
    if (!fs.existsSync("uploads")) {
      fs.mkdirSync("uploads");
    }
  });

  afterAll(() => {
    server.close();
  });

  it("should ACCEPT a valid JPEG file", async () => {
    const fileName = "valid.jpg";
    const filePath = path.join(process.cwd(), fileName);
    // Create valid JPEG header
    const buffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    fs.writeFileSync(filePath, buffer);

    const formData = new FormData();
    const file = new Blob([buffer], { type: "image/jpeg" });
    formData.append("file", file, fileName);

    const response = await fetch(`http://localhost:${port}/upload`, {
      method: "POST",
      body: formData,
    });

    fs.unlinkSync(filePath);

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("File uploaded successfully");
  });

  it("should ACCEPT a valid CSV file", async () => {
    const fileName = "valid.csv";
    const filePath = path.join(process.cwd(), fileName);
    const content = "col1,col2\nval1,val2";
    fs.writeFileSync(filePath, content);

    const formData = new FormData();
    const file = new Blob([content], { type: "text/csv" });
    formData.append("file", file, fileName);

    const response = await fetch(`http://localhost:${port}/upload`, {
      method: "POST",
      body: formData,
    });

    fs.unlinkSync(filePath);

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("File uploaded successfully");
  });

  it("should REJECT a CSV file containing PHP script", async () => {
    const fileName = "exploit.csv";
    const filePath = path.join(process.cwd(), fileName);
    const content = "col1,col2\n<?php phpinfo(); ?>";
    fs.writeFileSync(filePath, content);

    const formData = new FormData();
    const file = new Blob([content], { type: "text/csv" });
    formData.append("file", file, fileName);

    const response = await fetch(`http://localhost:${port}/upload`, {
      method: "POST",
      body: formData,
    });

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    expect(response.status).not.toBe(200);
    const text = await response.text();
    expect(text).toContain("Invalid file content");
  });
});
