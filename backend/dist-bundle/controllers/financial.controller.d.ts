import type { Request, Response } from 'express';
export declare const getTechnicianEarnings: (req: Request, res: Response) => Promise<void>;
export declare const getMyEarningsSummary: (req: Request, res: Response) => Promise<void>;
export declare const getFinancialChartData: (req: Request, res: Response) => Promise<void>;
export declare const getReinvestments: (req: Request, res: Response) => Promise<void>;
export declare const addReinvestment: (req: Request, res: Response) => Promise<void>;
export declare const getRecurringSchedules: (req: Request, res: Response) => Promise<void>;
export declare const payRecurringSchedule: (req: Request, res: Response) => Promise<void>;
export declare const deleteExpenseRecord: (req: Request, res: Response) => Promise<void>;
