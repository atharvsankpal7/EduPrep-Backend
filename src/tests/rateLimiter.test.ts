import { describe, expect, test, mock } from "bun:test";

// Mock express-rate-limit to verify configuration
mock.module("express-rate-limit", () => {
  return {
    rateLimit: (options: any) => {
      // Return a dummy middleware function with options attached for inspection
      const middleware = (req: any, res: any, next: any) => next();
      (middleware as any).options = options;
      return middleware;
    }
  };
});

// Mock logger to avoid dependency issues
mock.module("../utils/logger", () => ({
  default: {
    error: () => {},
    info: () => {},
    warn: () => {},
  },
}));

describe("Rate Limiters Configuration", () => {
  test("globalLimiter should be configured for 15 minutes and 100 requests", async () => {
    // Import dynamically so mocks are active
    const { globalLimiter } = await import("../utils/raterLimiter");

    const options = (globalLimiter as any).options;
    expect(options).toBeDefined();
    expect(options.windowMs).toBe(15 * 60 * 1000); // 15 minutes
    expect(options.limit).toBe(100);
    expect(options.message.message).toContain("Too many requests");
  });

  test("authLimiter should be configured for 15 minutes and 5 requests", async () => {
    // Import dynamically so mocks are active
    const { authLimiter } = await import("../utils/raterLimiter");

    const options = (authLimiter as any).options;
    expect(options).toBeDefined();
    expect(options.windowMs).toBe(15 * 60 * 1000); // 15 minutes
    expect(options.limit).toBe(5);
    expect(options.message.message).toContain("Too many login attempts");
  });
});
