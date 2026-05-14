import type { Request, Response, NextFunction } from 'express';
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authorizeRole: (roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
