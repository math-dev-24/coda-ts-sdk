export interface CodaClientConfig {
    apiToken?: string;
    baseUrl?: string;
    timeout?: number;
    retries?: number;
}

// Types de base
export interface CodaResponse<T> {
    items?: T[];
    href?: string;
    nextPageToken?: string;
    nextPageLink?: string;
}


export interface CodaUser {
    name: string;
    loginId: string;
    type: 'user' | 'workspace';
    scoped: boolean;
    tokenName?: string;
    href: string;
    workspace?: CodaWorkspace;
}


export interface CodaWorkspace {
    id: string;
    type: 'team' | 'personal';
    organizationId?: string;
    name: string;
    description?: string;
    logoUrl?: string;
    href: string;
}

// Documents
export interface CodaDoc {
    id: string;
    type: 'doc';
    href: string;
    browserLink: string;
    icon?: CodaIcon;
    name: string;
    owner: string;
    ownerName: string;
    docSize?: CodaDocSize;
    sourceDoc?: CodaDocReference;
    createdAt: string;
    updatedAt: string;
    published?: CodaPublishedDoc;
    folder: CodaFolderReference;
    workspace: CodaWorkspaceReference;
    workspaceId: string;
    folderId: string;
}

export interface CodaIcon {
    name?: string;
    type: 'emoji' | 'image' | 'icon';
    browserLink?: string;
}

export interface CodaDocSize {
    totalRowCount?: number;
    tableAndViewCount?: number;
    pageCount?: number;
    overApiSizeLimit?: boolean;
}

export interface CodaDocReference {
    id: string;
    type: 'doc';
    href: string;
    browserLink: string;
    name?: string;
}

export interface CodaPublishedDoc {
    description?: string;
    browserLink: string;
    imageLink?: string;
    discoverable: boolean;
    earnCredit: boolean;
    mode: 'view' | 'edit' | 'comment';
    categories: string[];
}

export interface CodaFolderReference {
    id: string;
    type: 'folder';
    href: string;
    browserLink: string;
    name: string;
}

export interface CodaWorkspaceReference {
    id: string;
    type: 'workspace';
    href: string;
    browserLink: string;
    name: string;
}

export type Layout = 'default' | 'areaChart' | 'barChart' | 'bubbleChart' | 'calendar' | 'card' | 'detail' | 'form' | 'ganttChart' | 'lineChart' | 'masterDetail' | 'pieChart' | 'scatterChart' | 'slide' | 'wordCloud';

// Tables
export interface CodaTable {
    id: string;
    type: 'table';
    href: string;
    browserLink: string;
    name: string;
    parent: CodaDocReference;
    parentTable?: CodaTableReference;
    displayColumn: CodaColumnReference;
    rowCount: number;
    sorts: CodaSort[];
    layout: Layout;
    createdAt: string;
    updatedAt: string;
    filter?: CodaFilter;
}

export interface CodaTableReference {
    id: string;
    type: 'table';
    href: string;
    browserLink: string;
    name: string;
}

export interface CodaColumnReference {
    id: string;
    type: 'column';
    href: string;
    name: string;
}

export interface CodaSort {
    column: CodaColumnReference;
    direction: 'ascending' | 'descending';
}

export interface CodaFilter {
    valid: boolean;
    isVolatile: boolean;
    hasUserFormula: boolean;
    hasTodayFormula: boolean;
    hasNowFormula: boolean;
}

// Colonnes
export interface CodaColumn {
    id: string;
    type: 'column';
    href: string;
    name: string;
    parent: CodaTableReference;
    calculated: boolean;
    formula?: string;
    defaultValue?: any;
    display: boolean;
    format: CodaColumnFormat;
}

export interface CodaColumnFormat {
    type: string;
    isArray: boolean;
    codaType?: string;
    precision?: number;
    useThousandsSeparator?: boolean;
    currencyCode?: string;
    format?: string;
    disableIf?: string;
    action?: string;
    label?: string;
    disableWithoutIcon?: boolean;
    packId?: number;
    formulaId?: string;
}

// Lignes
export interface CodaRow {
    id: string;
    type: 'row';
    href: string;
    name: string;
    index: number;
    browserLink: string;
    createdAt: string;
    updatedAt: string;
    values: Record<string, any>;
    parent: CodaTableReference;
}

export interface CodaRowRequest {
    cells: CodaCell[];
    keyColumns?: string[];
}

export interface CodaCell {
    column: string;
    value: any;
}

// Mutations
export interface CodaMutationStatus {
    id: string;
    status: 'complete' | 'failed' | 'inProgress';
    error?: string;
    completedAt?: string;
}

export interface CodaMutationResponse {
    requestId: string;
    addedRowIds?: string[];
}

// Paramètres de requête
export interface CodaListParams {
    limit?: number;
    pageToken?: string;
    sortBy?: string;
    orderBy?: 'asc' | 'desc';
}

export interface CodaDocListParams extends CodaListParams {
    isOwner?: boolean;
    isPublished?: boolean;
    query?: string;
    sourceDoc?: string;
    isStarred?: boolean;
    inGallery?: boolean;
    workspaceId?: string;
    folderId?: string;
}

export interface CodaTableListParams extends CodaListParams {
    tableTypes?: ('table' | 'view')[];
}

export interface CodaRowListParams extends CodaListParams {
    query?: string;
    useColumnNames?: boolean;
    valueFormat?: 'simple' | 'simpleWithArrays' | 'rich';
    visibleOnly?: boolean;
    syncToken?: string;
}

// Erreurs
export interface CodaError {
    statusCode: number;
    statusMessage: string;
    message: string;
    details?: any;
}

export class CodaApiError extends Error {
    public readonly statusCode: number;
    public readonly details?: any;

    constructor(message: string, statusCode: number, details?: any) {
        super(message);
        this.name = 'CodaApiError';
        this.statusCode = statusCode;
        this.details = details;
    }
}