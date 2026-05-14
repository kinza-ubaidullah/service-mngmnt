import { z } from 'zod';
export declare const createLeadSchema: z.ZodObject<{
    body: z.ZodObject<{
        customer_name: z.ZodString;
        customer_phone: z.ZodString;
        customer_area: z.ZodOptional<z.ZodString>;
        exact_address: z.ZodOptional<z.ZodString>;
        google_map_link: z.ZodOptional<z.ZodString>;
        product_type: z.ZodString;
        problem_details: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
