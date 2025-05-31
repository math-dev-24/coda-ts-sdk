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
    CodaError,
    CodaApiError,
    CodaDocListParams,
    CodaTableListParams,
    CodaRowListParams,
    CodaRowRequest,
    CodaListParams
} from '../types';

// Charge automatiquement les variables d'environnement
config();

export class CodaClient {
    private readonly apiToken: string;
    private readonly baseUrl: string;
    private readonly timeout: number;
    private readonly retries: number;

    constructor(configParam?: CodaClientConfig) {
        const cfg = configParam || {};

        // Récupération du token depuis .env ou config
        this.apiToken = cfg.apiToken || process.env.CODA_API_TOKEN || process.env.CODA_TOKEN || '';

        if (!this.apiToken) {
            throw new CodaApiError(
                'Token API Coda requis. Définissez CODA_API_TOKEN dans votre .env ou passez-le en paramètre.',
                401
            );
        }

        this.baseUrl = cfg.baseUrl || 'https://coda.io/apis/v1';
        this.timeout = cfg.timeout || 30000; // 30 secondes
        this.retries = cfg.retries || 3;
    }

    /**
     * Effectue une requête HTTP vers l'API Coda
     */
    private async request<T>(
        endpoint: string,
        options: {
            method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
            body?: any;
            params?: Record<string, any>;
        } = {}
    ): Promise<T> {
        const { method = 'GET', body, params } = options;
        const url = new URL(`${this.baseUrl}${endpoint}`);

        // Ajout des paramètres de requête
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

        // Logique de retry
        for (let attempt = 0; attempt <= this.retries; attempt++) {
            try {
                const response = await fetch(url.toString(), requestOptions);
                return await this.handleResponse<T>(response);
            } catch (error) {
                lastError = error as Error;

                // Ne pas retry sur les erreurs d'authentification ou de validation
                if (error instanceof CodaApiError && [401, 403, 400, 422].includes(error.statusCode)) {
                    throw error;
                }

                // Attendre avant le prochain essai (backoff exponentiel)
                if (attempt < this.retries) {
                    await this.sleep(Math.pow(2, attempt) * 1000);
                }
            }
        }

        throw lastError!;
    }

    /**
     * Gère la réponse HTTP et les erreurs
     */
    private async handleResponse<T>(response: Response): Promise<T> {
        const contentType = response.headers.get('content-type');
        const isJson = contentType?.includes('application/json');

        if (!response.ok) {
            let errorData: any = {};

            if (isJson) {
                try {
                    errorData = await response.json();
                } catch {
                    // Ignore les erreurs de parsing JSON
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
     * Utilitaire pour attendre
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // === MÉTHODES PUBLIQUES ===

    /**
     * Récupère les informations de l'utilisateur actuel
     */
    async whoAmI(): Promise<CodaUser> {
        return this.request<CodaUser>('/whoami');
    }

    /**
     * Liste tous les documents
     */
    async listDocs(params?: CodaDocListParams): Promise<CodaResponse<CodaDoc>> {
        return this.request<CodaResponse<CodaDoc>>('/docs', { params });
    }

    /**
     * Récupère un document par son ID
     */
    async getDoc(docId: string): Promise<CodaDoc> {
        return this.request<CodaDoc>(`/docs/${docId}`);
    }

    /**
     * Crée un nouveau document
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
     * Supprime un document
     */
    async deleteDoc(docId: string): Promise<CodaMutationResponse> {
        return this.request<CodaMutationResponse>(`/docs/${docId}`, { method: 'DELETE' });
    }

    /**
     * Liste les tables d'un document
     */
    async listTables(docId: string, params?: CodaTableListParams): Promise<CodaResponse<CodaTable>> {
        return this.request<CodaResponse<CodaTable>>(`/docs/${docId}/tables`, { params });
    }

    /**
     * Récupère une table par son ID
     */
    async getTable(docId: string, tableId: string): Promise<CodaTable> {
        return this.request<CodaTable>(`/docs/${docId}/tables/${tableId}`);
    }

    /**
     * Liste les colonnes d'une table
     */
    async listColumns(docId: string, tableId: string, params?: CodaListParams): Promise<CodaResponse<CodaColumn>> {
        return this.request<CodaResponse<CodaColumn>>(`/docs/${docId}/tables/${tableId}/columns`, { params });
    }

    /**
     * Récupère une colonne par son ID
     */
    async getColumn(docId: string, tableId: string, columnId: string): Promise<CodaColumn> {
        return this.request<CodaColumn>(`/docs/${docId}/tables/${tableId}/columns/${columnId}`);
    }

    /**
     * Liste les lignes d'une table
     */
    async listRows(docId: string, tableId: string, params?: CodaRowListParams): Promise<CodaResponse<CodaRow>> {
        return this.request<CodaResponse<CodaRow>>(`/docs/${docId}/tables/${tableId}/rows`, { params });
    }

    /**
     * Récupère une ligne par son ID
     */
    async getRow(docId: string, tableId: string, rowId: string, params?: { useColumnNames?: boolean; valueFormat?: string }): Promise<CodaRow> {
        return this.request<CodaRow>(`/docs/${docId}/tables/${tableId}/rows/${rowId}`, { params });
    }

    /**
     * Insère de nouvelles lignes dans une table
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
     * Met à jour une ligne existante
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
     * Supprime une ligne
     */
    async deleteRow(docId: string, tableId: string, rowId: string): Promise<CodaMutationResponse> {
        return this.request<CodaMutationResponse>(`/docs/${docId}/tables/${tableId}/rows/${rowId}`, {
            method: 'DELETE'
        });
    }

    /**
     * Supprime plusieurs lignes
     */
    async deleteRows(docId: string, tableId: string, rowIds: string[]): Promise<CodaMutationResponse> {
        const body = { rowIds };
        return this.request<CodaMutationResponse>(`/docs/${docId}/tables/${tableId}/rows`, {
            method: 'DELETE',
            body
        });
    }

    /**
     * Vérifie le statut d'une mutation
     */
    async getMutationStatus(requestId: string): Promise<CodaMutationStatus> {
        return this.request<CodaMutationStatus>(`/mutationStatus/${requestId}`);
    }

    /**
     * Attend qu'une mutation soit terminée
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
}