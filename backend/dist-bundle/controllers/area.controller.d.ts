import type { Request, Response } from 'express';
export declare const getAreas: (req: Request, res: Response) => Promise<void>;
export declare const createArea: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteArea: (req: Request, res: Response) => Promise<void>;
