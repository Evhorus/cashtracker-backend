import type { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../utils/jwt';
import User from '../models/user.model';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const bearer = req.headers.authorization;

  if (!bearer) {
    const error = new Error('Unauthorized');
    res.status(401).json({ error: error.message });
  }

  const token = bearer.split(' ')[1];

  if (!token) {
    const error = new Error('Invalid Token');
    res.status(401).json({ error: error.message });
  }

  try {
    const decoded = verifyJWT(token);

    if (typeof decoded === 'object' && decoded.id) {
      req.user = await User.findByPk(decoded.id, {
        attributes: ['id', 'name', 'email'],
      });
      next();
    }
  } catch (error) {
    // console.log(error);
    res.status(500).json({ error: 'Invalid Token' });
  }
};
