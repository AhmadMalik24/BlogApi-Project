import jwt from "jsonwebtoken";
import { jwtConfig, bcryptConfig, expireIn } from "../config/index.js";

const generateToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
  };
  const AccessToken = jwt.sign(payload, jwtConfig.accessToken, { expiresIn: expireIn.accessToken });

  return AccessToken;
};

const generateRefreshToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
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

export { generateToken, generateRefreshToken, verifyToken, verifyRefreshToken };
