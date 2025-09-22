import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Please enter a valid email address');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters long');
export const usernameSchema = z.string()
	.min(3, 'Username must be at least 3 characters long')
	.max(30, 'Username must be no more than 30 characters long')
	.regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

// User registration schema
export const registerSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
	passwordConfirm: z.string(),
	username: usernameSchema,
	name: z.string().min(1, 'Name is required').max(100, 'Name must be no more than 100 characters')
}).refine((data) => data.password === data.passwordConfirm, {
	message: "Passwords don't match",
	path: ["passwordConfirm"],
});

// User login schema
export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(1, 'Password is required')
});

// Profile update schema
export const profileSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100, 'Name must be no more than 100 characters'),
	username: usernameSchema,
	bio: z.string().max(500, 'Bio must be no more than 500 characters').optional()
});