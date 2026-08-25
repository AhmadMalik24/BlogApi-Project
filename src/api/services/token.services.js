import crypto from 'crypto';
import dotenv from 'dotenv';

import { Token } from "../../database/models/index.js";


dotenv.config();
const SaveToken = async (userId, token, type, expiresAt, userAgent, ip) => {

    const tokenDoc = new Token({
        user: userId,
        token,
        type,
        expiresAt,
        userAgent,
        ip
    });
    await tokenDoc.save();
    return tokenDoc;
};

// ##################### Key and IV for AES-256-CBC encryption/decryption #####################
const key = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'utf8');
const vi = Buffer.from(process.env.TOKEN_IV, 'utf8');

// ############################################################################################

const encryptToken = (token) => {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, vi);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};

const decryptToken = (encryptedToken) => {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, vi);
    let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

const isTokenExpired = (expiresAt) => {
    const currentTime = new Date();
    return currentTime > expiresAt;
};


const getTokenByUserIdAndType = async (userId, type) => {
    const tokenDoc = await Token.findOne({ user: userId, type }).sort({ createdAt: -1 });
    if (!tokenDoc) {
        const error = new Error('Invalid refresh token');
        error.statusCode = 401; // Set HTTP status code for your error handler
        throw error;
    }
    const decryptedToken = decryptToken(tokenDoc.token);
    const isExpired = isTokenExpired(tokenDoc.expiresAt);
    return { decryptedToken, isExpired };
};

const deleteTokenByUserIdAndType = async (userId, type) => {
    const result = await Token.deleteOne({ user: userId, type });
    return result.deletedCount > 0;
};

export { SaveToken, encryptToken, decryptToken, getTokenByUserIdAndType, deleteTokenByUserIdAndType };



