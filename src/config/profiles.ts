import { LogLevel } from '../utils/logger';
import {EnhancedCodaClientConfig} from "../client/codaClient";

/**
 * Profils for pre-defined configurations
 */
export const CONFIG_PROFILES = {
    // For development
    development: {
        logLevel: LogLevel.DEBUG,
        enableCache: true,
        enableRateLimit: true,
        enableMetrics: true,
        cacheTtl: 60000, // 1 minute de cache
        retries: 2,
        timeout: 10000
    } as EnhancedCodaClientConfig,

    // Configuration pour la production
    production: {
        logLevel: LogLevel.ERROR,
        enableCache: true,
        enableRateLimit: true,
        enableMetrics: true,
        cacheTtl: 300000, // 5 minutes
        retries: 3,
        timeout: 30000
    } as EnhancedCodaClientConfig,

    // For testing
    testing: {
        logLevel: LogLevel.WARN,
        enableCache: false,
        enableRateLimit: false,
        enableMetrics: true,
        retries: 1,
        timeout: 5000
    } as EnhancedCodaClientConfig,

    // Config for high performance
    highPerformance: {
        logLevel: LogLevel.ERROR,
        enableCache: true,
        enableRateLimit: true,
        enableMetrics: true,
        cacheTtl: 600000, // 10 minutes de cache
        retries: 5,
        timeout: 60000
    } as EnhancedCodaClientConfig,

    // Config for debugging
    debug: {
        logLevel: LogLevel.DEBUG,
        enableCache: true,
        enableRateLimit: false,
        enableMetrics: true,
        cacheTtl: 30000, // 30 secondes
        retries: 1,
        timeout: 15000
    } as EnhancedCodaClientConfig
};