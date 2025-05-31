import {RequestMetrics} from "../types/metrics.type";

export class MetricsCollector {
    private metrics: RequestMetrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        rateLimitHits: 0,
        avgResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        cacheHits: 0,
        lastRequestTime: 0
    };

    private responseTimes: number[] = [];
    private readonly maxResponseTimeHistory = 100;

    recordRequest(duration: number, success: boolean, fromCache: boolean = false): void {
        this.metrics.totalRequests++;
        this.metrics.lastRequestTime = Date.now();

        if (fromCache) {
            this.metrics.cacheHits++;
            return;
        }

        if (success) {
            this.metrics.successfulRequests++;
        } else {
            this.metrics.failedRequests++;
        }

        this.responseTimes.push(duration);
        if (this.responseTimes.length > this.maxResponseTimeHistory) {
            this.responseTimes.shift();
        }

        this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, duration);
        this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, duration);

        this.metrics.avgResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    }

    recordRateLimit(): void {
        this.metrics.rateLimitHits++;
    }

    getStats(): RequestMetrics {
        return { ...this.metrics };
    }

    getDetailedStats() {
        const stats = this.getStats();
        return {
            ...stats,
            successRate: stats.totalRequests > 0 ? stats.successfulRequests / stats.totalRequests : 0,
            errorRate: stats.totalRequests > 0 ? stats.failedRequests / stats.totalRequests : 0,
            cacheHitRate: stats.totalRequests > 0 ? stats.cacheHits / stats.totalRequests : 0,
            recentResponseTimes: [...this.responseTimes].slice(-10) // 10 derniers temps
        };
    }

    reset(): void {
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            rateLimitHits: 0,
            avgResponseTime: 0,
            minResponseTime: Infinity,
            maxResponseTime: 0,
            cacheHits: 0,
            lastRequestTime: 0
        };
        this.responseTimes = [];
    }

    // Export metrics (useful for monitoring externally)
    export(): string {
        const stats = this.getDetailedStats();
        return JSON.stringify(stats, null, 2);
    }
}