import {User} from "../models/user/user.model.ts";
import {ApiError} from "./ApiError.ts";

const generateAccessAndRefreshToken = async (userId: unknown) => {

    let user = await User.findById(userId).select("-password -refreshToken");
    if (!user) {
        throw new ApiError(404, "Invalid user id!");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    if (!accessToken || !refreshToken) {
        throw new ApiError(500, "Error generating tokens");
    }

    user.refreshToken = refreshToken;
    user = await user.save({validateBeforeSave: false});

    return {user, accessToken};

};
export default generateAccessAndRefreshToken;
