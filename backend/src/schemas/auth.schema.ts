import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().min(10, 'Phone number must be at least 10 characters').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters')
  }).refine(data => data.email || data.phone, {
    message: "Either email or phone is required",
    path: ["email"]
  })
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
