import { CodaClient } from '../client';
import {HealthReport, PerformanceAlert, RequestMetrics} from "../types";

/**
 * utils for monitoring and diagnostics
 */
export class MonitoringUtils {
    /**
     * Check performance and alert if needed
     */
    static watchPerformance(client: CodaClient, options?: {
        maxResponseTime?: number;
        minSuccessRate?: number;
        alertCallback?: (alert: PerformanceAlert) => void;
    }) {
        const opts = {
            maxResponseTime: 5000,
            minSuccessRate: 0.95,
            alertCallback: (alert: PerformanceAlert) => console.warn('🚨 Alert perform:', alert),
            ...options
        };

        return setInterval(async () => {
            const metrics = await client.getStats() as RequestMetrics;
            const alerts: PerformanceAlert[] = [];

            if (metrics && metrics.totalRequests > 0) {
                // Check response time
                if (metrics.avgResponseTime > opts.maxResponseTime) {
                    alerts.push({
                        type: 'HIGH_RESPONSE_TIME',
                        message: `Temps de réponse élevé: ${metrics.avgResponseTime.toFixed(0)}ms`,
                        value: metrics.avgResponseTime,
                        threshold: opts.maxResponseTime
                    });
                }

                // Check success rate
                const successRate = metrics.successfulRequests / metrics.totalRequests;

                if (successRate < opts.minSuccessRate) {
                    alerts.push({
                        type: 'LOW_SUCCESS_RATE',
                        message: `Taux de succès faible: ${(successRate * 100).toFixed(1)}%`,
                        value: successRate,
                        threshold: opts.minSuccessRate
                    });
                }

                // Check rate limits
                if (metrics.rateLimitHits > 0) {
                    alerts.push({
                        type: 'RATE_LIMIT_HIT',
                        message: `Rate limits atteints: ${metrics.rateLimitHits} fois`,
                        value: metrics.rateLimitHits,
                        threshold: 0
                    });
                }
            }

            // Send alerts
            alerts.forEach(alert => opts.alertCallback!(alert));

        }, 30000); // Check every 30 seconds
    }

    /**
     * Generate a health report for the client
     */
    static async generateHealthReport(client: CodaClient): Promise<HealthReport> {
        const detailedStats = await client.getDetailedStats();
        const now = Date.now();

        return {
            timestamp: now,
            status: this.calculateOverallHealth(detailedStats.metrics),
            metrics: detailedStats.metrics || {},
            cache: detailedStats.cache || {},
            rateLimiter: detailedStats.rateLimiter || {},
            recommendations: this.generateRecommendations(detailedStats)
        };
    }

    private static calculateOverallHealth(metrics?: RequestMetrics): 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' {
        if (!metrics || metrics.totalRequests === 0) {
            return 'HEALTHY';
        }

        const successRate = metrics.successfulRequests / metrics.totalRequests;
        const avgResponseTime = metrics.avgResponseTime;

        if (successRate >= 0.98 && avgResponseTime < 2000) {
            return 'HEALTHY';
        } else if (successRate >= 0.90 && avgResponseTime < 5000) {
            return 'DEGRADED';
        } else {
            return 'UNHEALTHY';
        }
    }

    private static generateRecommendations(stats: {
        metrics?: RequestMetrics;
        cache?: any;
        rateLimiter?: any;
    }): string[] {
        const recommendations: string[] = [];

        if (stats.metrics && stats.metrics.totalRequests > 0) {
            if (stats.metrics.avgResponseTime > 3000) {
                recommendations.push('Considérez augmenter le cache TTL pour réduire les appels API');
            }

            if (stats.metrics.rateLimitHits > 0) {
                recommendations.push('Implémentez un délai entre les requêtes pour éviter les rate limits');
            }

            const errorRate = stats.metrics.failedRequests / stats.metrics.totalRequests;
            if (errorRate > 0.1) {
                recommendations.push('Taux d\'erreur élevé, vérifiez la connectivité et les permissions');
            }
        }

        if (stats.cache && stats.cache.hitRate < 0.3) {
            recommendations.push('Taux de cache faible, ajustez la stratégie de mise en cache');
        }

        return recommendations;
    }
}