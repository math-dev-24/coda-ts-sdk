import { CodaClient } from '../client/codaClient';
import {CodaResponse, CodaRow, CodaRowRequest, CodaCell, CodaRowListParams} from '../types/coda.type';

/**
 * Helper pour paginer automatiquement à travers tous les résultats
 */
export async function* paginateAll<T>(
    fetcher: (pageToken?: string) => Promise<CodaResponse<T>>
): AsyncGenerator<T, void, unknown> {
    let pageToken: string | undefined;

    do {
        const response = await fetcher(pageToken);

        if (response.items) {
            for (const item of response.items) {
                yield item;
            }
        }

        pageToken = response.nextPageToken;
    } while (pageToken);
}

/**
 * Helper pour récupérer toutes les lignes d'une table
 */
export async function getAllRows(
    client: CodaClient,
    docId: string,
    tableId: string,
    options?: Pick<CodaRowListParams, 'useColumnNames' | 'valueFormat' | 'visibleOnly'>
): Promise<CodaRow[]> {
    const rows: CodaRow[] = [];

    for await (const row of paginateAll(pageToken =>
        client.listRows(docId, tableId, { ...options, pageToken })
    )) {
        rows.push(row);
    }

    return rows;
}

/**
 * Helper pour insérer des données en batch avec gestion automatique des erreurs
 */
export async function insertRowsBatch(
    client: CodaClient,
    docId: string,
    tableId: string,
    data: Record<string, any>[],
    options?: {
        batchSize?: number;
        keyColumns?: string[];
        waitForCompletion?: boolean;
    }
): Promise<string[]> {
    const batchSize = options?.batchSize || 100;
    const allRowIds: string[] = [];

    // Diviser les données en batches
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        // Convertir les données en format CodaRowRequest
        const rows: CodaRowRequest[] = batch.map(item => ({
            cells: Object.entries(item).map(([column, value]) => ({
                column,
                value
            }))
        }));

        const response = await client.insertRows(docId, tableId, rows, {
            keyColumns: options?.keyColumns
        });

        // Attendre la completion si demandé
        if (options?.waitForCompletion) {
            const status = await client.waitForMutation(response.requestId);
            if (status.status === 'failed') {
                throw new Error(`Échec de l'insertion du batch: ${status.error}`);
            }
        }

        if (response.addedRowIds) {
            allRowIds.push(...response.addedRowIds);
        }
    }

    return allRowIds;
}

/**
 * Helper pour créer des cellules facilement
 */
export function createCell(column: string, value: any): CodaCell {
    return { column, value };
}

/**
 * Helper pour créer une ligne avec des données typées
 */
export function createRow(data: Record<string, any>, keyColumns?: string[]): CodaRowRequest {
    return {
        cells: Object.entries(data).map(([column, value]) => createCell(column, value)),
        keyColumns
    };
}

/**
 * Helper pour formater les données de ligne en objet simple
 */
export function rowToObject(row: CodaRow): Record<string, any> {
    const result: Record<string, any> = {};

    if (row.values) {
        Object.entries(row.values).forEach(([key, value]) => {
            result[key] = value;
        });
    }

    return result;
}

/**
 * Helper pour rechercher des lignes par critères
 */
export async function findRows(
    client: CodaClient,
    docId: string,
    tableId: string,
    predicate: (row: CodaRow) => boolean,
    options?: Pick<CodaRowListParams, 'useColumnNames' | 'valueFormat' | 'visibleOnly'> & { limit?: number }
): Promise<CodaRow[]> {
    const results: CodaRow[] = [];
    const limit = options?.limit || Infinity;

    for await (const row of paginateAll(pageToken =>
        client.listRows(docId, tableId, {
            useColumnNames: options?.useColumnNames,
            valueFormat: options?.valueFormat,
            visibleOnly: options?.visibleOnly,
            pageToken
        })
    )) {
        if (predicate(row)) {
            results.push(row);
            if (results.length >= limit) {
                break;
            }
        }
    }

    return results;
}

/**
 * Helper pour trouver une ligne par une valeur de colonne spécifique
 */
export async function findRowByColumnValue(
    client: CodaClient,
    docId: string,
    tableId: string,
    columnName: string,
    value: any,
    options?: Pick<CodaRowListParams, 'useColumnNames' | 'valueFormat' | 'visibleOnly'>
): Promise<CodaRow | null> {
    const rows = await findRows(
        client,
        docId,
        tableId,
        (row) => {
            const rowObj = rowToObject(row);
            return rowObj[columnName] === value;
        },
        { ...options, limit: 1 }
    );

    return rows[0] || null;
}

/**
 * Helper pour mettre à jour ou insérer une ligne (upsert)
 */
export async function upsertRow(
    client: CodaClient,
    docId: string,
    tableId: string,
    data: Record<string, any>,
    keyColumn: string,
    options?: { waitForCompletion?: boolean }
): Promise<{ action: 'inserted' | 'updated'; rowId?: string; requestId: string }> {
    const keyValue = data[keyColumn];

    // Chercher la ligne existante
    const existingRow = await findRowByColumnValue(
        client,
        docId,
        tableId,
        keyColumn,
        keyValue,
        { useColumnNames: true }
    );

    if (existingRow) {
        // Mettre à jour la ligne existante
        const response = await client.updateRow(
            docId,
            tableId,
            existingRow.id,
            createRow(data)
        );

        if (options?.waitForCompletion) {
            await client.waitForMutation(response.requestId);
        }

        return {
            action: 'updated',
            rowId: existingRow.id,
            requestId: response.requestId
        };
    } else {
        // Insérer une nouvelle ligne
        const response = await client.insertRows(
            docId,
            tableId,
            [createRow(data)],
            { keyColumns: [keyColumn] }
        );

        if (options?.waitForCompletion) {
            await client.waitForMutation(response.requestId);
        }

        return {
            action: 'inserted',
            rowId: response.addedRowIds?.[0],
            requestId: response.requestId
        };
    }
}

/**
 * Helper pour exporter une table vers un format JSON
 */
/**
 * Helper pour exporter une table vers un format JSON
 */
export async function exportTableToJSON(
    client: CodaClient,
    docId: string,
    tableId: string,
    options?: {
        useColumnNames?: boolean;
        includeMetadata?: boolean;
        valueFormat?: 'simple' | 'simpleWithArrays' | 'rich';
    }
): Promise<any[]> {
    const rows = await getAllRows(client, docId, tableId, {
        useColumnNames: options?.useColumnNames ?? true,
        valueFormat: options?.valueFormat
    });

    return rows.map(row => {
        const data = rowToObject(row);

        if (options?.includeMetadata) {
            return {
                ...data,
                _metadata: {
                    id: row.id,
                    index: row.index,
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt,
                    browserLink: row.browserLink
                }
            };
        }

        return data;
    });
}