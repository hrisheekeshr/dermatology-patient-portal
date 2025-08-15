import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const demographicsSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dob: z.string().refine((date) => {
    const parsed = new Date(date);
    const now = new Date();
    const age = now.getFullYear() - parsed.getFullYear();
    return !isNaN(parsed.getTime()) && age >= 0 && age <= 120;
  }, 'Please enter a valid date of birth'),
  sexAtBirth: z.enum(['female', 'male', 'intersex', 'unknown', 'prefer_not_to_say']).refine((val) => val !== undefined, {
    message: 'Please select your sex assigned at birth',
  }),
  insuranceProvider: z.string().min(1, 'Insurance provider is required'),
  insuranceMemberId: z.string().min(1, 'Insurance member ID is required'),
  phone: z.string().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type DemographicsFormData = z.infer<typeof demographicsSchema>;
