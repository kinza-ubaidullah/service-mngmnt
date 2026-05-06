import { z } from 'zod';

export const createLeadSchema = z.object({
  body: z.object({
    customer_name: z.string().min(1, 'Customer name is required'),
    customer_phone: z.string().min(10, 'Valid phone number is required'),
    customer_area: z.string().optional(),
    exact_address: z.string().optional(),
    google_map_link: z.string().optional(),
    product_type: z.string().min(1, 'Product type is required'),
    problem_details: z.string().optional(),
  })
});
