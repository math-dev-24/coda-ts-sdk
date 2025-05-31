import { CodaClient } from '../codaClient';
import { CodaApiError, CodaRateLimitError } from '../../types';
import { LogLevel } from '../../utils';

import fetch from 'node-fetch';
import { jest } from '@jest/globals';

jest.mock('node-fetch');

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('CodaClient', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset environment variables
        process.env.CODA_API_TOKEN = 'fc90b0b2-e4ab-47d4-b67e-0dbe23h234';
    });

    describe('Constructor', () => {
        it('should initialize with environment token', () => {
            const client = new CodaClient();
            expect(client).toBeInstanceOf(CodaClient);
        });

        it('should throw error when no token provided', () => {
            delete process.env.CODA_API_TOKEN;
            delete process.env.CODA_TOKEN;

            expect(() => new CodaClient()).toThrow(CodaApiError);
            expect(() => new CodaClient()).toThrow('Token API Coda requis');
        });

        it('should accept token in config parameter', () => {
            delete process.env.CODA_API_TOKEN;

            const client = new CodaClient({
                apiToken: 'custom_token_1234567890abcdef'
            });
            expect(client).toBeInstanceOf(CodaClient);
        });

        it('should validate token format', () => {
            expect(() => new CodaClient({ apiToken: 'invalid' })).toThrow();
            expect(() => new CodaClient({ apiToken: 'short' })).toThrow();
            expect(() => new CodaClient({ apiToken: 'valid_token_1234567890abcdef' })).not.toThrow();
        });

        it('should initialize with custom configuration', () => {
            const client = new CodaClient({
                apiToken: 'test_token_1234567890abcdef',
                baseUrl: 'https://custom.api.url',
                timeout: 5000,
                retries: 1,
                logLevel: LogLevel.DEBUG,
                enableCache: false,
                enableRateLimit: false
            });

            expect(client).toBeInstanceOf(CodaClient);
        });
    });

    describe('API Methods', () => {
        let client: CodaClient;

        beforeEach(() => {
            client = new CodaClient({
                apiToken: 'test_token_1234567890abcdef',
                enableCache: false,
                enableRateLimit: false,
                logLevel: LogLevel.NONE
            });
        });

        describe('whoAmI', () => {
            it('should return user information', async () => {
                const mockResponse = {
                    name: 'Test User',
                    loginId: 'test@example.com',
                    type: 'user',
                    scoped: false,
                    href: 'https://coda.io/apis/v1/whoami'
                };

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    headers: { get: () => 'application/json' },
                    json: async () => mockResponse
                } as any);

                const result = await client.whoAmI();
                expect(result).toEqual(mockResponse);
                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('/whoami'),
                    expect.objectContaining({
                        method: 'GET',
                        headers: expect.objectContaining({
                            'Authorization': 'Bearer test_token_1234567890abcdef'
                        })
                    })
                );
            });
        });

        describe('listDocs', () => {
            it('should return documents list', async () => {
                const mockResponse = {
                    items: [
                        {
                            id: 'doc1',
                            type: 'doc',
                            href: 'https://coda.io/apis/v1/docs/doc1',
                            name: 'Test Document',
                            owner: 'test@example.com'
                        }
                    ]
                };

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    headers: { get: () => 'application/json' },
                    json: async () => mockResponse
                } as any);

                const result = await client.listDocs();
                expect(result).toEqual(mockResponse);
                expect(result.items).toHaveLength(1);
            });

            it('should handle query parameters', async () => {
                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    headers: { get: () => 'application/json' },
                    json: async () => ({ items: [] })
                } as any);

                await client.listDocs({
                    limit: 10,
                    isOwner: true,
                    query: 'test'
                });

                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('limit=10'),
                    expect.any(Object)
                );
                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('isOwner=true'),
                    expect.any(Object)
                );
                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('query=test'),
                    expect.any(Object)
                );
            });
        });

        describe('insertRows', () => {
            it('should insert rows successfully', async () => {
                const mockResponse = {
                    requestId: 'req123',
                    addedRowIds: ['row1', 'row2']
                };

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    status: 202,
                    headers: { get: () => 'application/json' },
                    json: async () => mockResponse
                } as any);

                const rows = [
                    {
                        cells: [
                            { column: 'Name', value: 'John' },
                            { column: 'Email', value: 'john@example.com' }
                        ]
                    }
                ];

                const result = await client.insertRows('doc1', 'table1', rows);
                expect(result).toEqual(mockResponse);
                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('/docs/doc1/tables/table1/rows'),
                    expect.objectContaining({
                        method: 'POST',
                        body: JSON.stringify({ rows })
                    })
                );
            });
        });
    });

    describe('Error Handling', () => {
        let client: CodaClient;

        beforeEach(() => {
            client = new CodaClient({
                apiToken: 'test_token_1234567890abcdef',
                enableCache: false,
                enableRateLimit: false,
                logLevel: LogLevel.NONE,
                retries: 0 // Disable retries for faster tests
            });
        });

        it('should handle 401 unauthorized error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                headers: { get: () => 'application/json' },
                json: async () => ({ message: 'Invalid token' })
            } as any);

            await expect(client.whoAmI()).rejects.toThrow(CodaApiError);
            await expect(client.whoAmI()).rejects.toThrow('Invalid token');
        });

        it('should handle 429 rate limit error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
                headers: {
                    get: (name: string) => {
                        if (name === 'retry-after') return '60';
                        if (name === 'content-type') return 'application/json';
                        return null;
                    }
                },
                json: async () => ({ message: 'Rate limit exceeded' })
            } as any);

            await expect(client.whoAmI()).rejects.toThrow(CodaRateLimitError);
        });

        it('should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(client.whoAmI()).rejects.toThrow('Network error');
        });

        it('should handle malformed JSON response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                headers: { get: () => 'application/json' },
                json: async () => { throw new Error('Invalid JSON'); }
            } as any);

            await expect(client.whoAmI()).rejects.toThrow(CodaApiError);
        });
    });

    describe('Mutation Management', () => {
        let client: CodaClient;

        beforeEach(() => {
            client = new CodaClient({
                apiToken: 'test_token_1234567890abcdef',
                enableCache: false,
                enableRateLimit: false,
                logLevel: LogLevel.NONE
            });
        });

        it('should check mutation status', async () => {
            const mockStatus = {
                id: 'req123',
                status: 'complete' as const,
                completedAt: '2023-01-01T00:00:00Z'
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: { get: () => 'application/json' },
                json: async () => mockStatus
            } as any);

            const result = await client.getMutationStatus('req123');
            expect(result).toEqual(mockStatus);
        });

        it('should wait for mutation completion', async () => {
            // First call: in progress
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: { get: () => 'application/json' },
                json: async () => ({ id: 'req123', status: 'inProgress' })
            } as any);

            // Second call: complete
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: { get: () => 'application/json' },
                json: async () => ({
                    id: 'req123',
                    status: 'complete',
                    completedAt: '2023-01-01T00:00:00Z'
                })
            } as any);

            const result = await client.waitForMutation('req123', {
                maxWaitTime: 5000,
                pollInterval: 100
            });

            expect(result.status).toBe('complete');
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it('should handle failed mutations', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: { get: () => 'application/json' },
                json: async () => ({
                    id: 'req123',
                    status: 'failed',
                    error: 'Validation error'
                })
            } as any);

            const result = await client.waitForMutation('req123');
            expect(result.status).toBe('failed');
            expect(result.error).toBe('Validation error');
        });

        it('should timeout on long running mutations', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                headers: { get: () => 'application/json' },
                json: async () => ({ id: 'req123', status: 'inProgress' })
            } as any);

            await expect(
                client.waitForMutation('req123', {
                    maxWaitTime: 200,
                    pollInterval: 50
                })
            ).rejects.toThrow('Timeout en attendant la completion');
        });
    });

    describe('Stats and Metrics', () => {
        it('should return stats when metrics are enabled', async () => {
            const client = new CodaClient({
                apiToken: 'test_token_1234567890abcdef',
                enableMetrics: true
            });

            const stats = await client.getStats();
            expect(stats).toBeDefined();
            expect(typeof stats).toBe('object');
        });

        it('should return empty object when metrics are disabled', async () => {
            const client = new CodaClient({
                apiToken: 'test_token_1234567890abcdef',
                enableMetrics: false
            });

            const stats = await client.getStats();
            expect(stats).toEqual({});
        });
    });
});