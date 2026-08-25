import catchAsync from "../../utils/catchAsync.js";
import { CreateUser, GetUserByEmail, UpdateUserPassword } from "../services/auth.services.js";
import { generateToken, generateRefreshToken, verifyToken, verifyRefreshToken, resetPasswordToken, verifyResetPasswordToken } from "../../utils/jwt.js";
import { SaveToken, encryptToken, deleteTokenByUserIdAndType, getTokenByUserIdAndType } from "../services/token.services.js";
import { expireIn } from "../../config/index.js";
import { getExpiryDate } from "../../utils/helpers.js";
import {
    getPasswordResetTemplate,
    getWelcomeTemplate
} from "../../integrations/email/templates.js";
import { sendEmail } from "../../integrations/email/client.js";


const registerUser = catchAsync(async (req, res) => {
    const { username, email, password, firstName, lastName, role } = req.body;
    const user = await CreateUser({ username, email, password, firstName, lastName, role });
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
    SaveToken(user._id, encryptedRefreshToken, 'refresh', expiresAt, req.headers['user-agent'], req.ip);

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

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const error = new Error('Authorization header missing or malformed');
        error.statusCode = 401;
        throw error;
    }

    const refreshToken = authHeader.split(' ')[1];
    let decoded;
    try {
        decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
        const err = new Error('Invalid refresh token');
        err.statusCode = 401;
        throw err;
    }

    const userId = decoded.userId;

    // Fetch the stored encrypted refresh token from the database
    const { decryptedToken, isExpired } = await getTokenByUserIdAndType(userId, 'refresh');

    if (isExpired) {
        const error = new Error('Refresh token has expired');
        error.statusCode = 401;
        throw error;
    }

    if (decryptedToken !== refreshToken) {
        const error = new Error('Refresh token does not match the stored token');
        error.statusCode = 401;
        throw error;
    }

    // Generate a new access token and refresh token
    const newAccessToken = generateToken(req.user);

    const deleted = await deleteTokenByUserIdAndType(req.user._id, 'refresh');
    if (!deleted) {
        const error = new Error('Failed to delete old refresh token');
        error.statusCode = 500;
        throw next(error);
    }

    const newRefreshToken = generateRefreshToken(req.user);

    const encryptedRefreshToken = encryptToken(newRefreshToken);
    const expiresAt = getExpiryDate(expireIn.refreshToken);

    // Save the new encrypted refresh token to the database
    await SaveToken(req.user._id, encryptedRefreshToken, 'refresh', expiresAt, req.headers['user-agent'], req.ip);
    res.status(200).json({ message: 'Access token refreshed successfully', AccessToken: newAccessToken, RefreshToken: newRefreshToken });
});
const forgotPassword = catchAsync(async (req, res) => {
    let userEmail; // ✅ Declare outside try block for scope

    try {
        const { email } = req.body;
        userEmail = email; // ✅ Store for use in catch block

        console.log(`Received forgot password request for email: ${email}`);

        // ✅ Validate email exists
        if (!email) {
            const error = new Error('Email is required');
            error.statusCode = 400;
            throw error;
        }

        const user = await GetUserByEmail(email);


        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        // Generate a reset password token
        const resetToken = resetPasswordToken(user);
        SaveToken(user._id, encryptToken(resetToken), 'resetPassword', getExpiryDate(expireIn.resetPasswordToken), req.headers['user-agent'], req.ip);


        // Create reset link
        const resetLink = `http://127.0.0.1:4000/reset-password.html?token=${resetToken}&email=${email}`;
        console.log(`Password reset link for ${email}: ${resetLink}`);

        // Send email
        const emailTemplate = getPasswordResetTemplate(resetLink, user.firstName);
        await sendEmail(email, 'Password Reset Request', emailTemplate);

        // ✅ SUCCESS - DO NOT send token back!
        res.status(200).json({
            success: true,
            message: 'Reset link sent to your email!'
        });

    } catch (error) {
        // ✅ Log the actual error for debugging
        console.error(`Error processing forgot password for ${userEmail || 'unknown'}:`, error);

        // ✅ Use proper status code if available
        const statusCode = error.statusCode || 500;
        const message = error.message || 'Failed to send reset link. Please try again later.';

        res.status(statusCode).json({
            success: false,
            message: message
        });
    }
});


const resetPassword = catchAsync(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        const error = new Error('Token and new password are required');
        error.statusCode = 400;
        throw error;
    }
    const decoded = verifyResetPasswordToken(token);
    if (!decoded) {
        const error = new Error('Invalid or expired reset token');
        error.statusCode = 400;
        throw error;
    }

    const user = await UpdateUserPassword(decoded.id, newPassword);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }
    const deleted = await deleteTokenByUserIdAndType(decoded.id, 'refresh');
    console.log(`Reset token deletion status for user ${decoded.id}:`, deleted);
    if (!deleted) {
        const error = new Error('Failed to delete reset token');
        error.statusCode = 500;
        throw error;
    }

    res.status(200).json({ message: 'Password reset successfully' });
});

export { registerUser, loginUser, logoutUser, refreshToken, forgotPassword, resetPassword };
