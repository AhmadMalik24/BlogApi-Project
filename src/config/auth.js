import dotenv from 'dotenv';
dotenv.config();

const jwtConfig = {
  accessToken: process.env.JWT_ACCESS_SECRET,
  refreshToken: process.env.JWT_REFRESH_SECRET,
};

const bcryptConfig = {
  saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10),
};

const expireIn = {
  accessToken: process.env.JWT_ACCESS_TOKEN_EXPIRE,
  refreshToken: process.env.JWT_REFRESH_TOKEN_EXPIRE,
};

export { jwtConfig, bcryptConfig, expireIn };