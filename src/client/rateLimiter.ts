export class RateLimiter {
    private requests: { timestamp: number; type: 'read' | 'write' }[] = [];

    async waitForSlot(type: 'read' | 'write'): Promise<void> {
        const now = Date.now();
        const window = 6000; // 6 seconds
        const limits = { read: 100, write: 10 };

        // Clear expired requests
        this.requests = this.requests.filter(req =>
            now - req.timestamp < window
        );

        const typeRequests = this.requests.filter(req => req.type === type);

        if (typeRequests.length >= limits[type]) {
            const oldestRequest = typeRequests[0];
            const waitTime = window - (now - oldestRequest.timestamp);
            await this.sleep(waitTime);
        }

        this.requests.push({ timestamp: now, type });
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Stats
    getStats() {
        const now = Date.now();
        const window = 6000;

        const recentRequests = this.requests.filter(req =>
            now - req.timestamp < window
        );

        return {
            totalRequests: this.requests.length,
            recentRequests: recentRequests.length,
            readRequests: recentRequests.filter(r => r.type === 'read').length,
            writeRequests: recentRequests.filter(r => r.type === 'write').length
        };
    }

    reset(): void {
        this.requests = [];
    }
}