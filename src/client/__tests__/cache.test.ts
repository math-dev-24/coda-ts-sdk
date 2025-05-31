import { ApiCache } from '../cache';
import { RateLimiter } from '../rateLimiter';
import { MetricsCollector } from '../metrics';

describe('ApiCache', () => {
    let cache: ApiCache;

    beforeEach(() => {
        cache = new ApiCache(1000); // 1 second TTL
    });

    describe('Basic operations', () => {
        it('should store and retrieve data', () => {
            const data = { test: 'value' };
            cache.set('key1', data);

            const retrieved = cache.get('key1');
            expect(retrieved).toEqual(data);
        });

        it('should return null for non-existent keys', () => {
            const result = cache.get('nonexistent');
            expect(result).toBeNull();
        });

        it('should respect TTL and expire entries', async () => {
            cache.set('key1', 'value', 100); // 100ms TTL

            expect(cache.get('key1')).toBe('value');

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(cache.get('key1')).toBeNull();
        });

        it('should use default TTL when not specified', () => {
            cache.set('key1', 'value');

            // Should still be available immediately
            expect(cache.get('key1')).toBe('value');
        });

        it('should delete entries', () => {
            cache.set('key1', 'value');
            expect(cache.get('key1')).toBe('value');

            const deleted = cache.delete('key1');
            expect(deleted).toBe(true);
            expect(cache.get('key1')).toBeNull();
        });

        it('should clear all entries', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            cache.clear();

            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBeNull();
        });
    });

    describe('Statistics', () => {
        it('should track cache hits and misses', () => {
            cache.set('key1', 'value');

            // Hit
            cache.get('key1');

            // Miss
            cache.get('nonexistent');

            const stats = cache.getStats();
            expect(stats.hits).toBe(1);
            expect(stats.misses).toBe(1);
            expect(stats.hitRate).toBe(0.5);
            expect(stats.size).toBe(1);
        });

        it('should reset stats when cleared', () => {
            cache.set('key1', 'value');
            cache.get('key1');
            cache.get('nonexistent');

            cache.clear();

            const stats = cache.getStats();
            expect(stats.hits).toBe(0);
            expect(stats.misses).toBe(0);
            expect(stats.hitRate).toBe(0);
            expect(stats.size).toBe(0);
        });
    });

    describe('Cleanup', () => {
        it('should remove expired entries during cleanup', async () => {
            cache.set('key1', 'value1', 50);
            cache.set('key2', 'value2', 200);

            // Wait for first key to expire
            await new Promise(resolve => setTimeout(resolve, 100));

            cache.cleanup();

            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBe('value2');
            expect(cache.getStats().size).toBe(1);
        });
    });
});

describe('RateLimiter', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
        rateLimiter = new RateLimiter();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Request limiting', () => {
        it('should allow requests within limits', async () => {
            const promises = [];

            // Should allow up to 100 read requests
            for (let i = 0; i < 50; i++) {
                promises.push(rateLimiter.waitForSlot('read'));
            }

            await Promise.all(promises);

            const stats = rateLimiter.getStats();
            expect(stats.readRequests).toBe(50);
        });

        it('should limit write requests more strictly', async () => {
            const promises = [];

            // Should allow up to 10 write requests
            for (let i = 0; i < 5; i++) {
                promises.push(rateLimiter.waitForSlot('write'));
            }

            await Promise.all(promises);

            const stats = rateLimiter.getStats();
            expect(stats.writeRequests).toBe(5);
        });

        it('should delay requests when limit is reached', async () => {
            // Fill up the read request quota
            const promises = [];
            for (let i = 0; i < 100; i++) {
                promises.push(rateLimiter.waitForSlot('read'));
            }
            await Promise.all(promises);

            // Next request should be delayed
            const startTime = Date.now();
            const delayedPromise = rateLimiter.waitForSlot('read');

            jest.advanceTimersByTime(6000); // Advance past the window
            await delayedPromise;

            // The request should have been delayed
            expect(Date.now() - startTime).toBeGreaterThanOrEqual(6000);
        });

        it('should track separate limits for read and write', async () => {
            // Fill read quota
            const readPromises = [];
            for (let i = 0; i < 100; i++) {
                readPromises.push(rateLimiter.waitForSlot('read'));
            }
            await Promise.all(readPromises);

            // Should still allow write requests
            await rateLimiter.waitForSlot('write');

            const stats = rateLimiter.getStats();
            expect(stats.readRequests).toBe(100);
            expect(stats.writeRequests).toBe(1);
        });
    });

    describe('Statistics', () => {
        it('should provide accurate stats', async () => {
            await rateLimiter.waitForSlot('read');
            await rateLimiter.waitForSlot('read');
            await rateLimiter.waitForSlot('write');

            const stats = rateLimiter.getStats();
            expect(stats.readRequests).toBe(2);
            expect(stats.writeRequests).toBe(1);
            expect(stats.recentRequests).toBe(3);
        });

        it('should clean up old requests from stats', async () => {
            await rateLimiter.waitForSlot('read');

            // Advance time beyond the window
            jest.advanceTimersByTime(7000);

            const stats = rateLimiter.getStats();
            expect(stats.recentRequests).toBe(0);
        });

        it('should reset stats', async () => {
            await rateLimiter.waitForSlot('read');
            await rateLimiter.waitForSlot('write');

            rateLimiter.reset();

            const stats = rateLimiter.getStats();
            expect(stats.totalRequests).toBe(0);
            expect(stats.readRequests).toBe(0);
            expect(stats.writeRequests).toBe(0);
        });
    });
});

describe('MetricsCollector', () => {
    let metrics: MetricsCollector;

    beforeEach(() => {
        metrics = new MetricsCollector();
    });

    describe('Request recording', () => {
        it('should record successful requests', () => {
            metrics.recordRequest(100, true);
            metrics.recordRequest(200, true);

            const stats = metrics.getStats();
            expect(stats.totalRequests).toBe(2);
            expect(stats.successfulRequests).toBe(2);
            expect(stats.failedRequests).toBe(0);
            expect(stats.avgResponseTime).toBe(150);
        });

        it('should record failed requests', () => {
            metrics.recordRequest(100, false);
            metrics.recordRequest(200, true);

            const stats = metrics.getStats();
            expect(stats.totalRequests).toBe(2);
            expect(stats.successfulRequests).toBe(1);
            expect(stats.failedRequests).toBe(1);
        });

        it('should track min and max response times', () => {
            metrics.recordRequest(50, true);
            metrics.recordRequest(200, true);
            metrics.recordRequest(100, true);

            const stats = metrics.getStats();
            expect(stats.minResponseTime).toBe(50);
            expect(stats.maxResponseTime).toBe(200);
        });

        it('should handle cache hits separately', () => {
            metrics.recordRequest(100, true, true); // from cache
            metrics.recordRequest(200, true, false); // not from cache

            const stats = metrics.getStats();
            expect(stats.totalRequests).toBe(2);
            expect(stats.cacheHits).toBe(1);
            expect(stats.successfulRequests).toBe(1); // cache hits don't count as API successes
        });

        it('should record rate limit hits', () => {
            metrics.recordRateLimit();
            metrics.recordRateLimit();

            const stats = metrics.getStats();
            expect(stats.rateLimitHits).toBe(2);
        });

        it('should update last request time', () => {
            const before = Date.now();
            metrics.recordRequest(100, true);
            const after = Date.now();

            const stats = metrics.getStats();
            expect(stats.lastRequestTime).toBeGreaterThanOrEqual(before);
            expect(stats.lastRequestTime).toBeLessThanOrEqual(after);
        });
    });

    describe('Response time tracking', () => {
        it('should maintain response time history', () => {
            // Add more than the max history
            for (let i = 0; i < 150; i++) {
                metrics.recordRequest(i * 10, true);
            }

            const detailedStats = metrics.getDetailedStats();
            expect(detailedStats.recentResponseTimes).toHaveLength(10);

            // Should contain the most recent times
            expect(detailedStats.recentResponseTimes).toContain(1490);
            expect(detailedStats.recentResponseTimes).toContain(1480);
        });

        it('should calculate average correctly with limited history', () => {
            // Add exactly 100 requests (the limit)
            for (let i = 1; i <= 100; i++) {
                metrics.recordRequest(i, true);
            }

            const stats = metrics.getStats();
            expect(stats.avgResponseTime).toBe(50.5); // Average of 1-100
        });
    });

    describe('Detailed statistics', () => {
        it('should calculate rates correctly', () => {
            metrics.recordRequest(100, true);
            metrics.recordRequest(200, true);
            metrics.recordRequest(150, false);
            metrics.recordRequest(120, true, true); // cache hit

            const detailedStats = metrics.getDetailedStats();
            expect(detailedStats.successRate).toBeCloseTo(0.5); // 2 successes out of 4 total
            expect(detailedStats.errorRate).toBeCloseTo(0.25); // 1 failure out of 4 total
            expect(detailedStats.cacheHitRate).toBeCloseTo(0.25); // 1 cache hit out of 4 total
        });

        it('should handle zero requests gracefully', () => {
            const detailedStats = metrics.getDetailedStats();
            expect(detailedStats.successRate).toBe(0);
            expect(detailedStats.errorRate).toBe(0);
            expect(detailedStats.cacheHitRate).toBe(0);
        });
    });

    describe('Export and reset', () => {
        it('should export metrics as JSON', () => {
            metrics.recordRequest(100, true);
            metrics.recordRateLimit();

            const exported = metrics.export();
            const parsed = JSON.parse(exported);

            expect(parsed).toMatchObject({
                totalRequests: 1,
                successfulRequests: 1,
                rateLimitHits: 1
            });
        });

        it('should reset all metrics', () => {
            metrics.recordRequest(100, true);
            metrics.recordRateLimit();

            metrics.reset();

            const stats = metrics.getStats();
            expect(stats.totalRequests).toBe(0);
            expect(stats.successfulRequests).toBe(0);
            expect(stats.rateLimitHits).toBe(0);
            expect(stats.minResponseTime).toBe(Infinity);
            expect(stats.maxResponseTime).toBe(0);
        });
    });
});