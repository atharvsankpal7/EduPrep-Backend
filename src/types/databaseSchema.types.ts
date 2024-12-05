export interface Student  {
    urn: number;
    email: string;
    fullName: string;
    password: string;
    refreshToken?: string;

    isPasswordCorrect(password: string): Promise<boolean>;

    generateAccessToken(): string;

    generateRefreshToken(): string;
}
