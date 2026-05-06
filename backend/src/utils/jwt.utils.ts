import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_here';
const JWT_EXPIRES_IN = '1d';

export const signToken = (payload: object) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};
