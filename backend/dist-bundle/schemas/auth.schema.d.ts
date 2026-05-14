import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        password: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type LoginInput = z.infer<typeof loginSchema>['body'];
