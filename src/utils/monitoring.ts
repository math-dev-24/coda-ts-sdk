import { CodaClient } from '../client/codaClient';
import {HealthReport, PerformanceAlert} from "../types/monitoring.type";

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

        return setInterval(() => {
            const stats = client.getStats();
            const alerts: PerformanceAlert[] = [];

            if (stats.metrics) {
                // Check response time
                if (stats.metrics.avgResponseTime > opts.maxResponseTime) {
                    alerts.push({
                        type: 'HIGH_RESPONSE_TIME',
                        message: `Temps de réponse élevé: ${stats.metrics.avgResponseTime.toFixed(0)}ms`,
                        value: stats.metrics.avgResponseTime,
                        threshold: opts.maxResponseTime
                    });
                }

                // Check success rate
                const successRate = stats.metrics.totalRequests > 0
                    ? stats.metrics.successfulRequests / stats.metrics.totalRequests
                    : 1;

                if (successRate < opts.minSuccessRate) {
                    alerts.push({
                        type: 'LOW_SUCCESS_RATE',
                        message: `Taux de succès faible: ${(successRate * 100).toFixed(1)}%`,
                        value: successRate,
                        threshold: opts.minSuccessRate
                    });
                }

                // Check rate limits
                if (stats.metrics.rateLimitHits > 0) {
                    alerts.push({
                        type: 'RATE_LIMIT_HIT',
                        message: `Rate limits atteints: ${stats.metrics.rateLimitHits} fois`,
                        value: stats.metrics.rateLimitHits,
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
    static generateHealthReport(client: CodaClient): HealthReport {
        const stats = client.getStats();
        const now = Date.now();

        return {
            timestamp: now,
            status: this.calculateOverallHealth(stats),
            metrics: stats.metrics || {},
            cache: stats.cache || {},
            rateLimiter: stats.rateLimiter || {},
            recommendations: this.generateRecommendations(stats)
        };
    }

    private static calculateOverallHealth(stats: any): 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' {
        if (!stats.metrics || stats.metrics.totalRequests === 0) {
            return 'HEALTHY';
        }

        const successRate = stats.metrics.successfulRequests / stats.metrics.totalRequests;
        const avgResponseTime = stats.metrics.avgResponseTime;

        if (successRate >= 0.98 && avgResponseTime < 2000) {
            return 'HEALTHY';
        } else if (successRate >= 0.90 && avgResponseTime < 5000) {
            return 'DEGRADED';
        } else {
            return 'UNHEALTHY';
        }
    }

    private static generateRecommendations(stats: any): string[] {
        const recommendations: string[] = [];

        if (stats.metrics) {
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