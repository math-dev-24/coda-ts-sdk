import { CodaClient } from '../client/codaClient';
import { CodaApiError } from '../types/coda.type';

describe('CodaClient', () => {
    it('should throw error when no token provided', () => {
        delete process.env.CODA_API_TOKEN;
        expect(() => new CodaClient()).toThrow(CodaApiError);
    });

    it('should validate token format', () => {
        expect(() => new CodaClient({ apiToken: 'invalid' })).toThrow();
        expect(() => new CodaClient({ apiToken: 'coda_1234567890abcdef' })).not.toThrow();
    });
});