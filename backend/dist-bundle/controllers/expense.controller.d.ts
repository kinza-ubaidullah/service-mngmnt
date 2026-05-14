import type { Request, Response } from 'express';
export declare const createExpense: (req: Request, res: Response) => Promise<void>;
export declare const getMyExpenses: (req: Request, res: Response) => Promise<void>;
export declare const getWalletSummary: (req: Request, res: Response) => Promise<void>;
