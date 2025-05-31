type CacheEntry<T> = { data: T; timestamp: number; ttl: number };

export class ApiCache {
    private cache = new Map<string, CacheEntry<any>>();
    private hits = 0;
    private misses = 0;

    constructor(private defaultTtl: number = 300000) {} // 5 min by default

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) {
            this.misses++;
            return null;
        }

        if (Date.now() > entry.timestamp + entry.ttl) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }

        this.hits++;
        return entry.data;
    }

    set<T>(key: string, data: T, ttl?: number): void {
        const actualTtl = ttl || this.defaultTtl;
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: actualTtl
        });
    }

    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    getStats() {
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0
        };
    }

    // Nettoyage automatique des entrées expirées
    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.timestamp + entry.ttl) {
                this.cache.delete(key);
            }
        }
    }
}