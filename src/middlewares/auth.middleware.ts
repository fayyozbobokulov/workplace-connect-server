import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

interface JwtPayload {
  id: string;
}

const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let token;

  // Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback_secret'
      ) as JwtPayload;

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');

      // If we got here, authentication was successful
      next();
      return;
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
      return;
    }
  }

  // No token found
  res.status(401).json({ message: 'Not authorized, no token' });
  return;
};

export { protect };