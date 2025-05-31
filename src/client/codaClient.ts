import { config } from 'dotenv';
import fetch, { Response } from 'node-fetch';
import {
    CodaClientConfig,
    CodaResponse,
    CodaUser,
    CodaDoc,
    CodaTable,
    CodaColumn,
    CodaRow,
    CodaMutationStatus,
    CodaMutationResponse,
    CodaApiError,
    CodaDocListParams,
    CodaTableListParams,
    CodaRowListParams,
    CodaRowRequest,
    CodaListParams,
    CodaRateLimitError,
    RequestMetrics,
    Method
} from '../types';
import {Logger, LogLevel} from "../utils";
import {RateLimiter} from "./rateLimiter";
import {ApiCache} from "./cache";
import {MetricsCollector} from "./metrics";

// Load environment variables
config();

export interface EnhancedCodaClientConfig extends CodaClientConfig {
    enableCache?: boolean;
    enableRateLimit?: boolean;
    enableMetrics?: boolean;
    logLevel?: LogLevel;
    cacheTtl?: number;
}

export class CodaClient {
    private readonly apiToken: string;
    private readonly baseUrl: string;
    private readonly timeout: number;
    private readonly retries: number;

    private readonly rateLimiter?: RateLimiter;
    private readonly cache?: ApiCache;
    private readonly metrics?: MetricsCollector;
    private readonly logger?: Logger;

    constructor(configParam?: EnhancedCodaClientConfig) {
        const cfg = configParam || {};

        // Config logger
        this.logger = new Logger(cfg.logLevel || LogLevel.ERROR);

        // Take API token from .env or config
        this.apiToken = cfg.apiToken || process.env.CODA_API_TOKEN || process.env.CODA_TOKEN || '';

        if (!this.apiToken) {
            throw new CodaApiError(
                'Token API Coda is required. Set CODA_API_TOKEN in your .env or pass it as a parameter.',
                401
            );
        }

        // Check token format
        if (!this.isValidTokenFormat(this.apiToken)) {
            this.logger.error('Token format invalid detected');
            throw new CodaApiError(
                'Token format invalid. Check your API token.',
                401
            );
        }

        this.baseUrl = cfg.baseUrl || 'https://coda.io/apis/v1';
        this.timeout = cfg.timeout || 30000; // 30 seconds
        this.retries = cfg.retries || 3;

        if (cfg.enableRateLimit !== false) {
            this.rateLimiter = new RateLimiter();
            this.logger.debug('Rate limiter activated');
        }

        if (cfg.enableCache !== false) {
            this.cache = new ApiCache(cfg.cacheTtl);
            this.logger.debug('Cache activated');
        }

        if (cfg.enableMetrics !== false) {
            this.metrics = new MetricsCollector();
            this.logger.debug('Metrics activated');
        }

        this.logger.info('CodaClient init with success');
    }

    /**
     * Check if the token format is valid
     * @param token The token to check
     * @returns True if the token format is valid, false otherwise
     */
    private isValidTokenFormat(token: string): boolean {
        return token.length > 20 && /^[a-zA-Z0-9_-]+$/.test(token.replace(/-/g, ''));
    }

    /**
     * Http request wrapper with monitoring
     */
    private async request<T>(
        endpoint: string,
        options: {
            method?: Method;
            body?: any;
            params?: Record<string, any>;
        } = {}
    ): Promise<T> {
        const { method = 'GET', body, params } = options;
        const url = new URL(`${this.baseUrl}${endpoint}`);

        // Add query parameters
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, String(value));
                }
            });
        }

        const requestOptions: any = {
            method,
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json',
                'User-Agent': 'coda-typescript-sdk/0.1.0'
            },
            timeout: this.timeout
        };

        if (body && (method === 'POST' || method === 'PUT')) {
            requestOptions.body = JSON.stringify(body);
        }

        let lastError: Error;

        // Logic of retry
        for (let attempt = 0; attempt <= this.retries; attempt++) {
            try {
                const response = await fetch(url.toString(), requestOptions);
                return await this.handleResponse<T>(response);
            } catch (error) {
                lastError = error as Error;

                // Don't retry on authentication or validation errors
                if (error instanceof CodaApiError && [401, 403, 400, 422].includes(error.statusCode)) {
                    throw error;
                }

                // Wait before the next attempt (exponential backoff)
                if (attempt < this.retries) {
                    await this.sleep(Math.pow(2, attempt) * 1000);
                }
            }
        }

        throw lastError!;
    }

    /**
     * HTTP response handler and error handling
     */
    private async handleResponse<T>(response: Response): Promise<T> {

        if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('retry-after') || '60');
            throw new CodaRateLimitError(retryAfter);
        }

        const contentType = response.headers.get('content-type');
        const isJson = contentType?.includes('application/json');

        if (!response.ok) {
            let errorData: any = {};

            if (isJson) {
                try {
                    errorData = await response.json();
                } catch {
                    console.error('Error parsing JSON response');
                }
            }

            throw new CodaApiError(
                errorData.message || `Erreur HTTP ${response.status}: ${response.statusText}`,
                response.status,
                errorData
            );
        }

        if (isJson) {
            return await response.json() as T;
        }

        return response.text() as any;
    }

    /**
     * Utility for waiting
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    //-------------------PUBLIC-METHODS----------------------------------------------------------------------------

    /**
     * Get the current user's information
     * @returns The current user's information
     */
    async whoAmI(): Promise<CodaUser> {
        return this.request<CodaUser>('/whoami');
    }

    /**
     * list all documents
     * @param params Optional query parameters
     * @returns A list of documents
     */
    async listDocs(params?: CodaDocListParams): Promise<CodaResponse<CodaDoc>> {
        return this.request<CodaResponse<CodaDoc>>('/docs', { params });
    }

    /**
     * Get document ID by URL
     * @param docUrl The document URL
     * @returns The document ID
     */
    getDocIdByUrl(docUrl: string): string {
        const regex = /\/d\/[^_]+_([^/]+)/;
        const match = docUrl.match(regex);
        if (match && match[1]) {
            return match[1];
        }
        return '';
    }

    /**
     * Take a document by its ID
     * @param docId The document ID
     * @returns The document
     */
    async getDoc(docId: string): Promise<CodaDoc> {
        return this.request<CodaDoc>(`/docs/${docId}`);
    }

    /**
     * Create new document
     * @param name The document name
     * @param options Optional parameters
     * @returns The created document
     */
    async createDoc(name: string, options?: {
        sourceDoc?: string;
        timezone?: string;
        folderId?: string;
        initialPage?: { name: string; subtitle?: string; iconName?: string; imageUrl?: string };
    }): Promise<CodaDoc> {
        const body = {
            name,
            ...options
        };
        return this.request<CodaDoc>('/docs', { method: 'POST', body });
    }

    /**
     * delete document
     */
    async deleteDoc(docId: string): Promise<CodaMutationResponse> {
        return this.request<CodaMutationResponse>(`/docs/${docId}`, { method: 'DELETE' });
    }

    /**
     * List all tables in a document
     */
    async listTables(docId: string, params?: CodaTableListParams): Promise<CodaResponse<CodaTable>> {
        return this.request<CodaResponse<CodaTable>>(`/docs/${docId}/tables`, { params });
    }

    /**
     * take a table by its ID
     */
    async getTable(docId: string, tableId: string): Promise<CodaTable> {
        return this.request<CodaTable>(`/docs/${docId}/tables/${tableId}`);
    }

    /**
     * List all columns in a table
     */
    async listColumns(docId: string, tableId: string, params?: CodaListParams): Promise<CodaResponse<CodaColumn>> {
        return this.request<CodaResponse<CodaColumn>>(`/docs/${docId}/tables/${tableId}/columns`, { params });
    }

    /**
     * take a column by its ID
     */
    async getColumn(docId: string, tableId: string, columnId: string): Promise<CodaColumn> {
        return this.request<CodaColumn>(`/docs/${docId}/tables/${tableId}/columns/${columnId}`);
    }

    /**
     * List all rows in a table
     */
    async listRows(docId: string, tableId: string, params?: CodaRowListParams): Promise<CodaResponse<CodaRow>> {
        return this.request<CodaResponse<CodaRow>>(`/docs/${docId}/tables/${tableId}/rows`, { params });
    }

    /**
     * take a row by its ID
     */
    async getRow(docId: string, tableId: string, rowId: string, params?: { useColumnNames?: boolean; valueFormat?: string }): Promise<CodaRow> {
        return this.request<CodaRow>(`/docs/${docId}/tables/${tableId}/rows/${rowId}`, { params });
    }

    /**
     * Insert new rows into a table
     */
    async insertRows(docId: string, tableId: string, rows: CodaRowRequest[], options?: {
        keyColumns?: string[];
        disableParsing?: boolean;
    }): Promise<CodaMutationResponse> {
        const body = {
            rows,
            ...options
        };
        return this.request<CodaMutationResponse>(`/docs/${docId}/tables/${tableId}/rows`, {
            method: 'POST',
            body
        });
    }

    /**
     * Update an existing row
     */
    async updateRow(docId: string, tableId: string, rowId: string, row: CodaRowRequest, options?: {
        disableParsing?: boolean;
    }): Promise<CodaMutationResponse> {
        const body = {
            row,
            ...options
        };
        return this.request<CodaMutationResponse>(`/docs/${docId}/tables/${tableId}/rows/${rowId}`, {
            method: 'PUT',
            body
        });
    }

    /**
     * Delete a row
     * @param docId The document ID
     * @param tableId The table ID
     * @param rowId The row ID
     * @returns The mutation response
     */
    async deleteRow(docId: string, tableId: string, rowId: string): Promise<CodaMutationResponse> {
        return this.request<CodaMutationResponse>(`/docs/${docId}/tables/${tableId}/rows/${rowId}`, {
            method: 'DELETE'
        });
    }

    /**
     * Delete multiple rows
     */
    async deleteRows(docId: string, tableId: string, rowIds: string[]): Promise<CodaMutationResponse> {
        const body = { rowIds };
        return this.request<CodaMutationResponse>(`/docs/${docId}/tables/${tableId}/rows`, {
            method: 'DELETE',
            body
        });
    }

    /**
     * Status of a mutation
     */
    async getMutationStatus(requestId: string): Promise<CodaMutationStatus> {
        return this.request<CodaMutationStatus>(`/mutationStatus/${requestId}`);
    }

    /**
     * Wait for a mutation to complete
     */
    async waitForMutation(requestId: string, options?: {
        maxWaitTime?: number;
        pollInterval?: number;
    }): Promise<CodaMutationStatus> {
        const maxWaitTime = options?.maxWaitTime || 30000; // 30 secondes
        const pollInterval = options?.pollInterval || 1000; // 1 seconde
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            const status = await this.getMutationStatus(requestId);

            if (status.status === 'complete' || status.status === 'failed') {
                return status;
            }

            await this.sleep(pollInterval);
        }

        throw new CodaApiError('Timeout en attendant la completion de la mutation', 408);
    }

    async getStats(): Promise<RequestMetrics|{}> {
        return this.metrics?.getStats() || {};
    }

    async getDetailedStats(): Promise<any> {
        return this.metrics?.getDetailedStats();
    }
}