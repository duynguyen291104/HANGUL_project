import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      console.warn(`[Auth] No token provided from ${req.ip}`);
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[Auth] JWT_SECRET not configured');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    (req as any).user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.warn(`[Auth] Token expired from ${req.ip}`);
      res.status(401).json({ error: 'Token expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.warn(`[Auth] Invalid token from ${req.ip}: ${error.message}`);
      res.status(401).json({ error: 'Invalid token' });
    } else {
      console.error(`[Auth] Unexpected error: ${error}`);
      res.status(500).json({ error: 'Authentication error' });
    }
    return;
  }
};
