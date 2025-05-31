export interface PerformanceAlert {
    type: 'HIGH_RESPONSE_TIME' | 'LOW_SUCCESS_RATE' | 'RATE_LIMIT_HIT';
    message: string;
    value: number;
    threshold: number;
}

export interface HealthReport {
    timestamp: number;
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    metrics: any;
    cache: any;
    rateLimiter: any;
    recommendations: string[];
}