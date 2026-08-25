import jwt from "jsonwebtoken";
import { jwtConfig, bcryptConfig, expireIn } from "../config/index.js";
import crypto from "crypto";


const generateToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    nounce: crypto.randomBytes(16).toString("hex"), // Generate a random nounce for added security
  };
  const AccessToken = jwt.sign(payload, jwtConfig.accessToken, { expiresIn: expireIn.accessToken });

  return AccessToken;
};

const generateRefreshToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    nounce: crypto.randomBytes(16).toString("hex"), // Generate a random nounce for added security
  };
  const RefreshToken = jwt.sign(payload, jwtConfig.refreshToken, { expiresIn: expireIn.refreshToken });

  return RefreshToken;
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.accessToken);
  } catch (error) {
    throw new Error("Invalid token");
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.refreshToken);
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
};

const resetPasswordToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
  };
  const ResetToken = jwt.sign(payload, jwtConfig.resetPasswordToken, { expiresIn: expireIn.resetPasswordToken });

  return ResetToken;
};

const verifyResetPasswordToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.resetPasswordToken);
  } catch (error) {
    throw new Error("Invalid reset password token");
  }
};

export { generateToken, generateRefreshToken, verifyToken, verifyRefreshToken, resetPasswordToken, verifyResetPasswordToken };
