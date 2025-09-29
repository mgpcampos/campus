export declare const RATE_LIMIT_WINDOW_MS: number;
export declare const RATE_LIMIT_TOKENS: number;
export declare function rateLimit(ip: string): boolean;
export declare function __resetRateLimit(): void;
export declare function __rateLimitStats(): {
	bucketCount: number;
};
