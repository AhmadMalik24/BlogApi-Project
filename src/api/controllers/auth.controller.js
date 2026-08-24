import catchAsync from "../../utils/catchAsync.js";
import { CreateUser, GetUserByEmail } from "../services/auth.services.js";
import { generateToken,generateRefreshToken} from "../../utils/jwt.js";
import {SaveRefreshToken, encryptToken,deleteTokenByUserIdAndType} from "../services/token.services.js";
import {expireIn} from "../../config/index.js";
import {getExpiryDate} from "../../utils/helpers.js";

const registerUser = catchAsync(async (req, res) => {
    const { username, email, password, firstName, lastName,role } = req.body;
    const user = await CreateUser({ username, email, password, firstName, lastName ,role});
    res.status(201).json({ message: 'User registered successfully', user });

});

const loginUser = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const user = await GetUserByEmail(email);

    if (!user || !(await user.comparePassword(password))) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
    }

    const AccessToken = generateToken(user);
    const RefreshToken = generateRefreshToken(user);

    const encryptedRefreshToken = encryptToken(RefreshToken);
    const expiresAt = getExpiryDate(expireIn.refreshToken);

    // Save the encrypted refresh token to the database
     SaveRefreshToken(user._id, encryptedRefreshToken, 'refresh', expiresAt, req.headers['user-agent'], req.ip);

    res.status(200).json({ message: 'User logged in successfully', AccessToken, RefreshToken });
});


const logoutUser = catchAsync(async (req, res) => {
    const deleted = await deleteTokenByUserIdAndType(req.user._id, 'refresh');
    if (!deleted) {
        const error = new Error('Failed to delete refresh token');
        error.statusCode = 500;
        throw error;
    }
    res.status(200).json({ message: 'User logged out successfully' });
});


const refreshToken = catchAsync(async (req, res) => {

    const newAccessToken = generateToken(req.user);

    const deleted = await deleteTokenByUserIdAndType(req.user._id, 'refresh');
    if (!deleted) {
        const error = new Error('Failed to delete old refresh token');
        error.statusCode = 500;
        throw error;
    }

    const newRefreshToken = generateRefreshToken(req.user);

    const encryptedRefreshToken = encryptToken(newRefreshToken);
    const expiresAt = getExpiryDate(expireIn.refreshToken);

    // Save the new encrypted refresh token to the database
    SaveRefreshToken(req.user._id, encryptedRefreshToken, 'refresh', expiresAt, req.headers['user-agent'], req.ip);
    res.status(200).json({ message: 'Access token refreshed successfully', AccessToken: newAccessToken, RefreshToken: newRefreshToken });
});




export { registerUser, loginUser, logoutUser,refreshToken };
