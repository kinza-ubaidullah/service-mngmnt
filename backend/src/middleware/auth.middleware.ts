import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils';
import { prisma } from '../utils/prisma';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  console.log('Authenticating request to:', req.url);
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized. Token missing.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ message: 'Unauthorized. Token missing.' });
      return;
    }

    const decoded = verifyToken(token) as { id: number, role: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || !user.is_active) {
      res.status(401).json({ message: 'Unauthorized. User not found or inactive.' });
      return;
    }

    // Attach user to request
    (req as any).user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized. Invalid token.' });
  }
};

export const authorizeRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ message: 'Forbidden. You do not have permission to perform this action.' });
      return;
    }
    next();
  };
};
