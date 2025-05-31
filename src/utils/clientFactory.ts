import { CodaClient, EnhancedCodaClientConfig } from '../client';
import { CONFIG_PROFILES } from '../config/profiles';

export type ConfigProfile = keyof typeof CONFIG_PROFILES;

/**
 * Factory  for creating CodaClients
 */
export class CodaClientFactory {
    /**
     * Create a client with a profile preset
     */
    static createWithProfile(profile: ConfigProfile, overrides?: Partial<EnhancedCodaClientConfig>): CodaClient {
        const baseConfig = CONFIG_PROFILES[profile];
        const finalConfig = { ...baseConfig, ...overrides };
        return new CodaClient(finalConfig);
    }

    /**
     * Create a client for development
     */
    static forDevelopment(overrides?: Partial<EnhancedCodaClientConfig>): CodaClient {
        return this.createWithProfile('development', overrides);
    }

    /**
     * Create a client for production
     */
    static forProduction(overrides?: Partial<EnhancedCodaClientConfig>): CodaClient {
        return this.createWithProfile('production', overrides);
    }

    /**
     * Create a client for tests
     */
    static forTesting(overrides?: Partial<EnhancedCodaClientConfig>): CodaClient {
        return this.createWithProfile('testing', overrides);
    }

    /**
     * Create a client with automatic environment detection
     */
    static createAuto(overrides?: Partial<EnhancedCodaClientConfig>): CodaClient {
        const env = process.env.NODE_ENV || 'development';

        let profile: ConfigProfile;
        switch (env) {
            case 'production':
                profile = 'production';
                break;
            case 'test':
                profile = 'testing';
                break;
            default:
                profile = 'development';
        }

        return this.createWithProfile(profile, overrides);
    }
}
