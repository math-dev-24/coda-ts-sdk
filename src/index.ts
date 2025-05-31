export * from './types/index.type';
export * from './helpers';
// Client
export { CodaClient } from './client/codaClient';
export type { EnhancedCodaClientConfig } from './client/codaClient';
// Logger
export { Logger, LogLevel } from './utils/logger';


// Utilitaires et factory
export { CodaClientFactory } from './utils/clientFactory';
export type { ConfigProfile } from './utils/clientFactory';

// Monitoring et diagnostics
export { MonitoringUtils } from './utils/monitoring';
export type { PerformanceAlert, HealthReport } from './types/monitoring.type';


export { RateLimiter } from './client/rateLimiter';
export { ApiCache } from './client/cache';
export { MetricsCollector } from './client/metrics';
export type { RequestMetrics } from './types/metrics.type';

// Profils de configuration
export { CONFIG_PROFILES } from './config/profiles';

// Export par défaut
import { CodaClient } from './client/codaClient';
export default CodaClient;