import { describe, it, expect } from 'vitest';
import { 
	emailSchema, 
	passwordSchema, 
	usernameSchema, 
	registerSchema, 
	loginSchema, 
	profileSchema 
} from './validation.js';

describe('Email validation', () => {
	it('should accept valid email addresses', () => {
		const validEmails = [
			'test@example.com',
			'user.name@domain.co.uk',
			'student@university.edu'
		];

		validEmails.forEach(email => {
			expect(() => emailSchema.parse(email)).not.toThrow();
		});
	});

	it('should reject invalid email addresses', () => {
		const invalidEmails = [
			'invalid-email',
			'@domain.com',
			'user@',
			''
		];

		invalidEmails.forEach(email => {
			expect(() => emailSchema.parse(email)).toThrow();
		});
	});
});

describe('Password validation', () => {
	it('should accept passwords with 8+ characters', () => {
		const validPasswords = [
			'password123',
			'mySecurePass',
			'12345678'
		];

		validPasswords.forEach(password => {
			expect(() => passwordSchema.parse(password)).not.toThrow();
		});
	});

	it('should reject passwords with less than 8 characters', () => {
		const invalidPasswords = [
			'short',
			'1234567',
			''
		];

		invalidPasswords.forEach(password => {
			expect(() => passwordSchema.parse(password)).toThrow();
		});
	});
});

describe('Username validation', () => {
	it('should accept valid usernames', () => {
		const validUsernames = [
			'user123',
			'test_user',
			'JohnDoe',
			'abc'
		];

		validUsernames.forEach(username => {
			expect(() => usernameSchema.parse(username)).not.toThrow();
		});
	});

	it('should reject invalid usernames', () => {
		const invalidUsernames = [
			'ab', // too short
			'a'.repeat(31), // too long
			'user-name', // contains dash
			'user name', // contains space
			'user@name', // contains special char
			''
		];

		invalidUsernames.forEach(username => {
			expect(() => usernameSchema.parse(username)).toThrow();
		});
	});
});

describe('Registration schema', () => {
	it('should accept valid registration data', () => {
		const validData = {
			email: 'test@example.com',
			password: 'password123',
			passwordConfirm: 'password123',
			username: 'testuser',
			name: 'Test User'
		};

		expect(() => registerSchema.parse(validData)).not.toThrow();
	});

	it('should reject when passwords do not match', () => {
		const invalidData = {
			email: 'test@example.com',
			password: 'password123',
			passwordConfirm: 'different123',
			username: 'testuser',
			name: 'Test User'
		};

		expect(() => registerSchema.parse(invalidData)).toThrow();
	});

	it('should reject when required fields are missing', () => {
		const invalidData = {
			email: 'test@example.com',
			password: 'password123',
			passwordConfirm: 'password123',
			username: 'testuser'
			// name is missing
		};

		expect(() => registerSchema.parse(invalidData)).toThrow();
	});
});

describe('Login schema', () => {
	it('should accept valid login data', () => {
		const validData = {
			email: 'test@example.com',
			password: 'password123'
		};

		expect(() => loginSchema.parse(validData)).not.toThrow();
	});

	it('should reject invalid login data', () => {
		const invalidData = {
			email: 'invalid-email',
			password: ''
		};

		expect(() => loginSchema.parse(invalidData)).toThrow();
	});
});

describe('Profile schema', () => {
	it('should accept valid profile data', () => {
		const validData = {
			name: 'Test User',
			username: 'testuser',
			bio: 'This is my bio'
		};

		expect(() => profileSchema.parse(validData)).not.toThrow();
	});

	it('should accept profile data without bio', () => {
		const validData = {
			name: 'Test User',
			username: 'testuser'
		};

		expect(() => profileSchema.parse(validData)).not.toThrow();
	});

	it('should reject profile with too long bio', () => {
		const invalidData = {
			name: 'Test User',
			username: 'testuser',
			bio: 'a'.repeat(501) // too long
		};

		expect(() => profileSchema.parse(invalidData)).toThrow();
	});
});