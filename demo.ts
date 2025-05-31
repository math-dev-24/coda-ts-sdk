import { CodaClient, getAllRows, insertRowsBatch, createRow } from '@math-dev-24/coda-ts-sdk';

async function exempleUtilisation() {
    try {
        // Initialisation du client (charge automatiquement CODA_API_TOKEN depuis .env)
        const coda = new CodaClient();

        console.log('🚀 Démarrage de l\'exemple Coda SDK...\n');

        // 1. Vérifier la connexion
        const user = await coda.whoAmI();
        console.log(`✅ Connecté en tant que: ${user.name}`);
        console.log(`📧 Email: ${user.loginId}\n`);

        // 2. Lister les documents
        console.log('📚 Récupération de vos documents...');
        const docsResponse = await coda.listDocs({ limit: 10 });
        const docs = docsResponse.items || [];

        console.log(`📄 ${docs.length} documents trouvés:`);
        docs.forEach((doc, index) => {
            console.log(`  ${index + 1}. ${doc.name} (${doc.id})`);
        });

        if (docs.length === 0) {
            console.log('❌ Aucun document trouvé. Créez d\'abord un document sur coda.io');
            return;
        }

        // 3. Utiliser le premier document trouvé
        const premierDoc = docs[0];
        console.log(`\n🎯 Utilisation du document: "${premierDoc.name}"`);

        // 4. Lister les tables du document
        console.log('📊 Récupération des tables...');
        const tablesResponse = await coda.listTables(premierDoc.id);
        const tables = tablesResponse.items || [];

        console.log(`🗃️  ${tables.length} tables trouvées:`);
        tables.forEach((table, index) => {
            console.log(`  ${index + 1}. ${table.name} (${table.rowCount} lignes)`);
        });

        if (tables.length === 0) {
            console.log('❌ Aucune table trouvée dans ce document.');
            return;
        }

        // 5. Utiliser la première table
        const premiereTable = tables[0];
        console.log(`\n📋 Utilisation de la table: "${premiereTable.name}"`);

        // 6. Récupérer les colonnes
        console.log('🏗️  Récupération des colonnes...');
        const colonnesResponse = await coda.listColumns(premierDoc.id, premiereTable.id);
        const colonnes = colonnesResponse.items || [];

        console.log(`📝 ${colonnes.length} colonnes trouvées:`);
        colonnes.forEach((colonne, index) => {
            console.log(`  ${index + 1}. ${colonne.name} (${colonne.format.type})`);
        });

        // 7. Récupérer quelques lignes avec les noms de colonnes
        console.log('\n📖 Récupération des données...');
        const lignesResponse = await coda.listRows(premierDoc.id, premiereTable.id, {
            limit: 5,
            useColumnNames: true
        });

        const lignes = lignesResponse.items || [];
        console.log(`📊 ${lignes.length} lignes récupérées (sur ${premiereTable.rowCount} total):`);

        lignes.forEach((ligne, index) => {
            console.log(`  Ligne ${index + 1}:`, ligne.values);
        });

        // 8. Exemple d'insertion (commenté pour éviter de modifier les données)
        /*
        console.log('\n➕ Exemple d\'insertion de données...');

        // Créer des données d'exemple
        const nouvellesDonnees = [
          { [premiereColonne]: 'Exemple 1', [deuxiemeColonne]: 'Valeur 1' },
          { [premiereColonne]: 'Exemple 2', [deuxiemeColonne]: 'Valeur 2' }
        ];

        const insertionResponse = await insertRowsBatch(
          coda,
          premierDoc.id,
          premiereTable.id,
          nouvellesDonnees,
          {
            batchSize: 10,
            waitForCompletion: true
          }
        );

        console.log(`✅ ${insertionResponse.length} lignes insérées avec succès!`);
        */

        // 9. Exemple avec helper getAllRows pour récupérer toutes les données
        console.log('\n🔄 Récupération de toutes les lignes avec pagination automatique...');
        const toutesLesLignes = await getAllRows(coda, premierDoc.id, premiereTable.id, {
            useColumnNames: true,
            valueFormat: 'simple'
        });

        console.log(`📈 Total de ${toutesLesLignes.length} lignes récupérées`);

        console.log('\n🎉 Exemple terminé avec succès!');

    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution:', error);

        if (error instanceof Error) {
            console.error('Message:', error.message);
            if ('statusCode' in error) {
                console.error('Code de statut:', (error as any).statusCode);
            }
        }
    }
}

// Exécuter l'exemple si ce fichier est lancé directement
if (require.main === module) {
    exempleUtilisation();
}

export { exempleUtilisation };