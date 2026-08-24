import { verifyToken, verifyRefreshToken } from "../../utils/jwt.js";
import { getTokenByUserIdAndType } from "../services/token.services.js ";
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const error = new Error("Unauthorized: No token provided");
    error.name = "AuthError";
    return next(error);
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    const authError = new Error("Unauthorized: Invalid token");
    authError.name = "AuthError";
    return next(authError);
  }
};

const protectRefreshToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const error = new Error("Unauthorized: No token provided");
    error.name = "AuthError";
    return next(error);
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyRefreshToken(token);
    const {  decryptedToken, isExpired } = await getTokenByUserIdAndType(decoded.userId, 'refresh');
    if (isExpired) {
      const error = new Error('Unauthorized: Refresh token has expired');
      error.name = "AuthError";
      return next(error);
    }
    if (token === decryptedToken) {
      req.user = { _id: decoded.userId, email: decoded.email };
      next();
    } else {
      const error = new Error('Unauthorized: Invalid refresh token');
      error.name = "AuthError";
      return next(error);
    }
  } catch (error) {
    const authError = new Error("Unauthorized: Invalid refresh token");
    authError.name = "AuthError";
    return next(authError);
  }
};
export { protect, protectRefreshToken };
