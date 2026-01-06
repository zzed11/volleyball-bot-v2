import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if user is authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource',
    });
    return;
  }

  next();
}

/**
 * Middleware to check if user is active
 */
export function requireActiveUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource',
    });
    return;
  }

  const user = req.user as any;

  if (!user.is_active) {
    res.status(403).json({
      error: 'Account inactive',
      message: 'Your account is inactive. Please contact an administrator.',
    });
    return;
  }

  next();
}
