import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireManager = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'MANAGER') {
        return res.status(403).json({ message: 'Manager access required' });
    }
    next();
};
