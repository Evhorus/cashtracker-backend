import jwt from 'jsonwebtoken';

export const generateJWT = (id: string) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  return token;
};

export const verifyJWT = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
