import { ApiError } from "./ApiError";
import { generateTokensForUser } from "../db/helpers/auth.helpers";
import { findUserByIdSecure } from "../db/helpers/user.helpers";

const generateAccessAndRefreshToken = async (userId: number) => {

    const { accessToken } = await generateTokensForUser(userId);
    const user = await findUserByIdSecure(userId);
    if (!user) {
        throw new ApiError(404, "Invalid user id!");
    }

    return {user, accessToken};

};
export default generateAccessAndRefreshToken;
