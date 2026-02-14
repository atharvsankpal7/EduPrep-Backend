import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";

// Mock the dependencies before importing the module under test
const mockGenerateTokensForUser = mock();

mock.module("../db/helpers/auth.helpers", () => ({
  generateTokensForUser: mockGenerateTokensForUser,
}));

// Now import the module under test
import generateAccessAndRefreshToken from "./tokenGenerator";

describe("generateAccessAndRefreshToken", () => {
  afterEach(() => {
    mockGenerateTokensForUser.mockReset();
  });

  it("should generate tokens and return user without password (optimized)", async () => {
    const userId = 1;
    const mockUser = {
      id: 1,
      email: "test@example.com",
      fullName: "Test User",
      password: "hashedpassword",
      refreshToken: "old_refresh_token",
      role: "student",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockAccessToken = "access_token";
    const mockRefreshToken = "new_refresh_token";

    mockGenerateTokensForUser.mockResolvedValue({
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      user: mockUser,
    });

    const result = await generateAccessAndRefreshToken(userId);

    expect(mockGenerateTokensForUser).toHaveBeenCalledWith(userId);

    expect(result.accessToken).toBe(mockAccessToken);

    // Check that password is removed
    expect(result.user).not.toHaveProperty("password");
    // Check that refreshToken is updated
    expect(result.user.refreshToken).toBe(mockRefreshToken);
    // Check other properties
    expect(result.user.id).toBe(mockUser.id);
    expect(result.user.email).toBe(mockUser.email);
  });

  it("should throw error if generateTokensForUser fails", async () => {
    const userId = 999;
    mockGenerateTokensForUser.mockRejectedValue(new Error("User not found"));

    expect(generateAccessAndRefreshToken(userId)).rejects.toThrow("User not found");
  });
});
