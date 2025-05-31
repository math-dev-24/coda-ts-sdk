export interface RequestMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    rateLimitHits: number;
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    cacheHits: number;
    lastRequestTime: number;
}