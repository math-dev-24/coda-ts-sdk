# Coda TypeScript SDK

SDK TypeScript moderne pour l'API Coda.io avec gestion automatique des variables d'environnement.

## Installation

```bash
npm install @math-dev-24/coda-ts-sdk
```

## Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine de votre projet :

```env
CODA_API_TOKEN=votre_token_ici
```

### Génération du token

1. Allez sur [coda.io/account](https://coda.io/account)
2. Cliquez sur "Generate API token"
3. Copiez le token dans votre fichier `.env`

⚠️ **Important** : Ne jamais commiter votre token ! Ajoutez `.env` à votre `.gitignore`.

## Usage de base

```typescript
import { CodaClient } from '@votre-org/coda-typescript-sdk';

// Le client charge automatiquement le token depuis .env
const coda = new CodaClient();

// Ou passez le token manuellement
const coda = new CodaClient({ 
  apiToken: 'votre-token' 
});

async function exemple() {
  // Récupérer les infos utilisateur
  const user = await coda.whoAmI();
  console.log(`Connecté en tant que: ${user.name}`);

  // Lister les documents
  const docs = await coda.listDocs();
  console.log(`${docs.items?.length} documents trouvés`);

  // Récupérer un document spécifique
  const doc = await coda.getDoc('votre-doc-id');
  
  // Lister les tables du document
  const tables = await coda.listTables(doc.id);
  
  // Récupérer les lignes d'une table
  const rows = await coda.listRows(doc.id, 'votre-table-id', {
    useColumnNames: true
  });
}
```

## Exemples avancés

### Insertion de données

```typescript
import { createRow } from '@votre-org/coda-typescript-sdk';

// Insérer une ligne
const response = await coda.insertRows(docId, tableId, [
  createRow({
    'Nom': 'John Doe',
    'Email': 'john@example.com',
    'Age': 30
  })
]);

// Attendre que l'insertion soit terminée
const status = await coda.waitForMutation(response.requestId);
console.log(`Statut: ${status.status}`);
```

### Helpers utilitaires

```typescript
import { 
  getAllRows, 
  insertRowsBatch, 
  findRowByColumnValue,
  upsertRow,
  exportTableToJSON 
} from '@votre-org/coda-typescript-sdk';

// Récupérer toutes les lignes (pagination automatique)
const allRows = await getAllRows(coda, docId, tableId);

// Insertion en batch
const rowIds = await insertRowsBatch(coda, docId, tableId, [
  { nom: 'Alice', age: 25 },
  { nom: 'Bob', age: 30 },
  // ... plus de données
], {
  batchSize: 50,
  waitForCompletion: true
});

// Rechercher une ligne spécifique
const row = await findRowByColumnValue(
  coda, docId, tableId, 
  'Email', 'john@example.com'
);

// Upsert (insert ou update)
await upsertRow(coda, docId, tableId, {
  'Email': 'jane@example.com',
  'Nom': 'Jane Doe',
  'Age': 28
}, 'Email'); // colonne clé

// Exporter en JSON
const data = await exportTableToJSON(coda, docId, tableId, {
  useColumnNames: true,
  includeMetadata: true
});
```

### Gestion des erreurs

```typescript
import { CodaApiError } from '@votre-org/coda-typescript-sdk';

try {
  const doc = await coda.getDoc('invalid-id');
} catch (error) {
  if (error instanceof CodaApiError) {
    console.error(`Erreur API (${error.statusCode}): ${error.message}`);
    console.error('Détails:', error.details);
  } else {
    console.error('Erreur inconnue:', error);
  }
}
```

### Pagination automatique

```typescript
import { paginateAll } from '@votre-org/coda-typescript-sdk';

// Itérer sur tous les résultats automatiquement
for await (const doc of paginateAll(pageToken => 
  coda.listDocs({ pageToken })
)) {
  console.log(`Document: ${doc.name}`);
}
```

## Configuration avancée

```typescript
const coda = new CodaClient({
  apiToken: 'votre-token',
  baseUrl: 'https://coda.io/apis/v1', // URL personnalisée
  timeout: 30000, // 30 secondes
  retries: 3 // Nombre de tentatives en cas d'échec
});
```

## Types TypeScript

Le SDK est entièrement typé avec TypeScript. Tous les types de l'API Coda sont disponibles :

```typescript
import type { 
  CodaDoc, 
  CodaTable, 
  CodaRow, 
  CodaColumn,
  CodaMutationStatus 
} from '@votre-org/coda-typescript-sdk';
```

## Licence

MIT

## Contributing

Les contributions sont les bienvenues ! Veuillez ouvrir une issue ou soumettre une pull request.