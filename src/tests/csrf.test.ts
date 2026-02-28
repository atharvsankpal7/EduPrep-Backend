import { describe, it, expect, mock, beforeAll } from "bun:test";
import request from "supertest";

mock.module("../utils/logger.ts", () => ({
  default: {
    error: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    debug: mock(() => {}),
  },
}));

const { app } = await import("../app");

describe("CSRF Protection", () => {
  it("GET /api/v1/csrf-token should return a CSRF token", async () => {
    const res = await request(app).get("/api/v1/csrf-token");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.csrfToken).toBeDefined();
    expect(typeof res.body.csrfToken).toBe("string");
  });

  it("POST /api/v1/user/login without CSRF token should return 403", async () => {
    const res = await request(app)
      .post("/api/v1/user/login")
      .send({ email: "test@example.com", password: "password123" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid CSRF Token");
  });
});
