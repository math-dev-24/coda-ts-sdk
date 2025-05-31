import {
    paginateAll,
    getAllRows,
    insertRowsBatch,
    createCell,
    createRow,
    rowToObject,
    findRows,
    findRowByColumnValue,
    upsertRow,
    exportTableToJSON
} from '../index';
import { CodaClient } from '../../client/codaClient';
import { CodaRow } from '../../types';

// Mock du client
jest.mock('../../client/codaClient');
const MockedCodaClient = CodaClient as jest.MockedClass<typeof CodaClient>;

describe('Helpers', () => {
    let mockClient: jest.Mocked<CodaClient>;

    beforeEach(() => {
        mockClient = new MockedCodaClient() as jest.Mocked<CodaClient>;
    });

    describe('paginateAll', () => {
        it('should paginate through all results', async () => {
            const mockFetcher = jest.fn()
                .mockResolvedValueOnce({
                    items: [{ id: '1', name: 'Item 1' }],
                    nextPageToken: 'token1'
                })
                .mockResolvedValueOnce({
                    items: [{ id: '2', name: 'Item 2' }],
                    nextPageToken: 'token2'
                })
                .mockResolvedValueOnce({
                    items: [{ id: '3', name: 'Item 3' }],
                    nextPageToken: undefined
                });

            const results: any[] = [];
            for await (const item of paginateAll(mockFetcher)) {
                results.push(item);
            }

            expect(results).toHaveLength(3);
            expect(results[0]).toEqual({ id: '1', name: 'Item 1' });
            expect(results[2]).toEqual({ id: '3', name: 'Item 3' });
            expect(mockFetcher).toHaveBeenCalledTimes(3);
        });

        it('should handle empty results', async () => {
            const mockFetcher = jest.fn().mockResolvedValueOnce({
                items: [],
                nextPageToken: undefined
            });

            const results: any[] = [];
            for await (const item of paginateAll(mockFetcher)) {
                results.push(item);
            }

            expect(results).toHaveLength(0);
            expect(mockFetcher).toHaveBeenCalledTimes(1);
        });
    });

    describe('createCell', () => {
        it('should create a cell object', () => {
            const cell = createCell('Name', 'John Doe');
            expect(cell).toEqual({
                column: 'Name',
                value: 'John Doe'
            });
        });
    });

    describe('createRow', () => {
        it('should create a row request from data', () => {
            const data = {
                'Name': 'John Doe',
                'Email': 'john@example.com',
                'Age': 30
            };

            const row = createRow(data);
            expect(row.cells).toHaveLength(3);
            expect(row.cells).toContainEqual({ column: 'Name', value: 'John Doe' });
            expect(row.cells).toContainEqual({ column: 'Email', value: 'john@example.com' });
            expect(row.cells).toContainEqual({ column: 'Age', value: 30 });
        });

        it('should include key columns when specified', () => {
            const data = { 'Email': 'john@example.com' };
            const row = createRow(data, ['Email']);

            expect(row.keyColumns).toEqual(['Email']);
        });
    });

    describe('rowToObject', () => {
        it('should convert row to simple object', () => {
            const mockRow: CodaRow = {
                id: 'row1',
                type: 'row',
                href: 'https://coda.io/apis/v1/docs/doc1/tables/table1/rows/row1',
                name: 'Row 1',
                index: 0,
                browserLink: 'https://coda.io/d/doc1#table1/r1',
                createdAt: '2023-01-01T00:00:00Z',
                updatedAt: '2023-01-01T00:00:00Z',
                values: {
                    'Name': 'John Doe',
                    'Email': 'john@example.com',
                    'Age': 30
                },
                parent: {
                    id: 'table1',
                    type: 'table',
                    href: 'https://coda.io/apis/v1/docs/doc1/tables/table1',
                    browserLink: 'https://coda.io/d/doc1#table1',
                    name: 'Users'
                }
            };

            const obj = rowToObject(mockRow);
            expect(obj).toEqual({
                'Name': 'John Doe',
                'Email': 'john@example.com',
                'Age': 30
            });
        });

        it('should handle rows without values', () => {
            const mockRow: CodaRow = {
                id: 'row1',
                type: 'row',
                href: 'https://coda.io/apis/v1/docs/doc1/tables/table1/rows/row1',
                name: 'Row 1',
                index: 0,
                browserLink: 'https://coda.io/d/doc1#table1/r1',
                createdAt: '2023-01-01T00:00:00Z',
                updatedAt: '2023-01-01T00:00:00Z',
                values: {},
                parent: {
                    id: 'table1',
                    type: 'table',
                    href: 'https://coda.io/apis/v1/docs/doc1/tables/table1',
                    browserLink: 'https://coda.io/d/doc1#table1',
                    name: 'Users'
                }
            };

            const obj = rowToObject(mockRow);
            expect(obj).toEqual({});
        });
    });

    describe('getAllRows', () => {
        it('should get all rows from a table', async () => {
            const mockRows: CodaRow[] = [
                {
                    id: 'row1',
                    type: 'row',
                    href: 'https://coda.io/apis/v1/docs/doc1/tables/table1/rows/row1',
                    name: 'Row 1',
                    index: 0,
                    browserLink: 'https://coda.io/d/doc1#table1/r1',
                    createdAt: '2023-01-01T00:00:00Z',
                    updatedAt: '2023-01-01T00:00:00Z',
                    values: { 'Name': 'John' },
                    parent: {
                        id: 'table1',
                        type: 'table',
                        href: 'https://coda.io/apis/v1/docs/doc1/tables/table1',
                        browserLink: 'https://coda.io/d/doc1#table1',
                        name: 'Users'
                    }
                }
            ];

            mockClient.listRows
                .mockResolvedValueOnce({
                    items: mockRows,
                    nextPageToken: undefined
                });

            const result = await getAllRows(mockClient, 'doc1', 'table1');
            expect(result).toEqual(mockRows);
            expect(mockClient.listRows).toHaveBeenCalledWith('doc1', 'table1', {
                pageToken: undefined
            });
        });
    });

    describe('insertRowsBatch', () => {
        it('should insert data in batches', async () => {
            const data = [
                { Name: 'John', Email: 'john@example.com' },
                { Name: 'Jane', Email: 'jane@example.com' },
                { Name: 'Bob', Email: 'bob@example.com' }
            ];

            mockClient.insertRows
                .mockResolvedValueOnce({
                    requestId: 'req1',
                    addedRowIds: ['row1', 'row2']
                })
                .mockResolvedValueOnce({
                    requestId: 'req2',
                    addedRowIds: ['row3']
                });

            const result = await insertRowsBatch(
                mockClient,
                'doc1',
                'table1',
                data,
                { batchSize: 2 }
            );

            expect(result).toEqual(['row1', 'row2', 'row3']);
            expect(mockClient.insertRows).toHaveBeenCalledTimes(2);
        });

        it('should wait for completion when requested', async () => {
            const data = [{ Name: 'John' }];

            mockClient.insertRows.mockResolvedValueOnce({
                requestId: 'req1',
                addedRowIds: ['row1']
            });

            mockClient.waitForMutation.mockResolvedValueOnce({
                id: 'req1',
                status: 'complete',
                completedAt: '2023-01-01T00:00:00Z'
            });

            await insertRowsBatch(
                mockClient,
                'doc1',
                'table1',
                data,
                { waitForCompletion: true }
            );

            expect(mockClient.waitForMutation).toHaveBeenCalledWith('req1');
        });
    });

    describe('findRowByColumnValue', () => {
        it('should find row by column value', async () => {
            const mockRow: CodaRow = {
                id: 'row1',
                type: 'row',
                href: 'https://coda.io/apis/v1/docs/doc1/tables/table1/rows/row1',
                name: 'Row 1',
                index: 0,
                browserLink: 'https://coda.io/d/doc1#table1/r1',
                createdAt: '2023-01-01T00:00:00Z',
                updatedAt: '2023-01-01T00:00:00Z',
                values: {
                    'Email': 'john@example.com',
                    'Name': 'John Doe'
                },
                parent: {
                    id: 'table1',
                    type: 'table',
                    href: 'https://coda.io/apis/v1/docs/doc1/tables/table1',
                    browserLink: 'https://coda.io/d/doc1#table1',
                    name: 'Users'
                }
            };

            mockClient.listRows.mockResolvedValueOnce({
                items: [mockRow],
                nextPageToken: undefined
            });

            const result = await findRowByColumnValue(
                mockClient,
                'doc1',
                'table1',
                'Email',
                'john@example.com'
            );

            expect(result).toEqual(mockRow);
        });

        it('should return null when row not found', async () => {
            mockClient.listRows.mockResolvedValueOnce({
                items: [],
                nextPageToken: undefined
            });

            const result = await findRowByColumnValue(
                mockClient,
                'doc1',
                'table1',
                'Email',
                'notfound@example.com'
            );

            expect(result).toBeNull();
        });
    });

    describe('upsertRow', () => {
        it('should update existing row', async () => {
            const existingRow: CodaRow = {
                id: 'row1',
                type: 'row',
                href: 'https://coda.io/apis/v1/docs/doc1/tables/table1/rows/row1',
                name: 'Row 1',
                index: 0,
                browserLink: 'https://coda.io/d/doc1#table1/r1',
                createdAt: '2023-01-01T00:00:00Z',
                updatedAt: '2023-01-01T00:00:00Z',
                values: { 'Email': 'john@example.com' },
                parent: {
                    id: 'table1',
                    type: 'table',
                    href: 'https://coda.io/apis/v1/docs/doc1/tables/table1',
                    browserLink: 'https://coda.io/d/doc1#table1',
                    name: 'Users'
                }
            };

            mockClient.listRows.mockResolvedValueOnce({
                items: [existingRow],
                nextPageToken: undefined
            });

            mockClient.updateRow.mockResolvedValueOnce({
                requestId: 'req1'
            });

            const result = await upsertRow(
                mockClient,
                'doc1',
                'table1',
                { Email: 'john@example.com', Name: 'John Updated' },
                'Email'
            );

            expect(result.action).toBe('updated');
            expect(result.rowId).toBe('row1');
            expect(mockClient.updateRow).toHaveBeenCalled();
        });

        it('should insert new row when not found', async () => {
            mockClient.listRows.mockResolvedValueOnce({
                items: [],
                nextPageToken: undefined
            });

            mockClient.insertRows.mockResolvedValueOnce({
                requestId: 'req1',
                addedRowIds: ['row2']
            });

            const result = await upsertRow(
                mockClient,
                'doc1',
                'table1',
                { Email: 'new@example.com', Name: 'New User' },
                'Email'
            );

            expect(result.action).toBe('inserted');
            expect(result.rowId).toBe('row2');
            expect(mockClient.insertRows).toHaveBeenCalled();
        });
    });

    describe('exportTableToJSON', () => {
        it('should export table data to JSON', async () => {
            const mockRows: CodaRow[] = [
                {
                    id: 'row1',
                    type: 'row',
                    href: 'https://coda.io/apis/v1/docs/doc1/tables/table1/rows/row1',
                    name: 'Row 1',
                    index: 0,
                    browserLink: 'https://coda.io/d/doc1#table1/r1',
                    createdAt: '2023-01-01T00:00:00Z',
                    updatedAt: '2023-01-01T00:00:00Z',
                    values: { Name: 'John', Age: 30 },
                    parent: {
                        id: 'table1',
                        type: 'table',
                        href: 'https://coda.io/apis/v1/docs/doc1/tables/table1',
                        browserLink: 'https://coda.io/d/doc1#table1',
                        name: 'Users'
                    }
                }
            ];

            mockClient.listRows.mockResolvedValueOnce({
                items: mockRows,
                nextPageToken: undefined
            });

            const result = await exportTableToJSON(
                mockClient,
                'doc1',
                'table1'
            );

            expect(result).toEqual([
                { Name: 'John', Age: 30 }
            ]);
        });

        it('should include metadata when requested', async () => {
            const mockRows: CodaRow[] = [
                {
                    id: 'row1',
                    type: 'row',
                    href: 'https://coda.io/apis/v1/docs/doc1/tables/table1/rows/row1',
                    name: 'Row 1',
                    index: 0,
                    browserLink: 'https://coda.io/d/doc1#table1/r1',
                    createdAt: '2023-01-01T00:00:00Z',
                    updatedAt: '2023-01-01T00:00:00Z',
                    values: { Name: 'John' },
                    parent: {
                        id: 'table1',
                        type: 'table',
                        href: 'https://coda.io/apis/v1/docs/doc1/tables/table1',
                        browserLink: 'https://coda.io/d/doc1#table1',
                        name: 'Users'
                    }
                }
            ];

            mockClient.listRows.mockResolvedValueOnce({
                items: mockRows,
                nextPageToken: undefined
            });

            const result = await exportTableToJSON(
                mockClient,
                'doc1',
                'table1',
                { includeMetadata: true }
            );

            expect(result[0]).toMatchObject({
                Name: 'John',
                _metadata: {
                    id: 'row1',
                    index: 0,
                    createdAt: '2023-01-01T00:00:00Z',
                    updatedAt: '2023-01-01T00:00:00Z',
                    browserLink: 'https://coda.io/d/doc1#table1/r1'
                }
            });
        });
    });
});