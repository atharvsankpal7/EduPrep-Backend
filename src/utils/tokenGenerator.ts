import { generateTokensForUser } from "../db/helpers/auth.helpers";

const generateAccessAndRefreshToken = async (userId: number) => {

    const { accessToken, refreshToken, user: fullUser } = await generateTokensForUser(userId);

    // Create a new user object with the updated refresh token
    const user = {
        ...fullUser,
        refreshToken
    };

    // Remove password from the user object to avoid exposing it
    if ('password' in user) {
        delete (user as any).password;
    }

    return {user, accessToken};

};
export default generateAccessAndRefreshToken;
