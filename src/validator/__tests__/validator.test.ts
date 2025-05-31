import { DataValidator } from '../index';

describe('DataValidator', () => {
    describe('validateRowData', () => {
        it('should validate correct row data', () => {
            const validData = {
                'Name': 'John Doe',
                'Email': 'john@example.com',
                'Age': 30,
                'Active': true,
                'Tags': ['developer', 'typescript'],
                'Score': 95.5,
                'Notes': null
            };

            const errors = DataValidator.validateRowData(validData);
            expect(errors).toHaveLength(0);
        });

        it('should reject empty column names', () => {
            const invalidData = {
                '': 'value',
                ' ': 'another value',
                'Valid': 'good value'
            };

            const errors = DataValidator.validateRowData(invalidData);
            expect(errors).toHaveLength(2);
            expect(errors[0]).toContain('Name of column ""');
            expect(errors[1]).toContain('Name of column " "');
        });

        it('should reject non-string column names', () => {
            // Cette situation ne devrait pas arriver en TypeScript normal,
            // mais on teste quand même pour la robustesse
            const invalidData = {} as any;
            invalidData[123] = 'value';
            invalidData[0] = 'another value';

            const errors = DataValidator.validateRowData(invalidData);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should reject nested objects as values', () => {
            const invalidData = {
                'Name': 'John',
                'Config': { setting: 'value' }, // Objects not supported
                'Profile': { id: 1, name: 'test' }
            };

            const errors = DataValidator.validateRowData(invalidData);
            expect(errors).toHaveLength(2);
            expect(errors[0]).toContain('Unsupported value type for column "Config"');
            expect(errors[1]).toContain('Unsupported value type for column "Profile"');
        });

        it('should allow arrays as values', () => {
            const validData = {
                'Tags': ['tag1', 'tag2'],
                'Numbers': [1, 2, 3],
                'Mixed': ['text', 123, true]
            };

            const errors = DataValidator.validateRowData(validData);
            expect(errors).toHaveLength(0);
        });

        it('should allow primitive values', () => {
            const validData = {
                'String': 'text',
                'Number': 123,
                'Boolean': true,
                'Null': null,
                'Undefined': undefined
            };

            const errors = DataValidator.validateRowData(validData);
            expect(errors).toHaveLength(0);
        });

        it('should handle empty data', () => {
            const emptyData = {};
            const errors = DataValidator.validateRowData(emptyData);
            expect(errors).toHaveLength(0);
        });

        it('should handle special characters in column names', () => {
            const dataWithSpecialChars = {
                'Column with spaces': 'value1',
                'Column-with-dashes': 'value2',
                'Column_with_underscores': 'value3',
                'Column.with.dots': 'value4',
                'Column@with@symbols': 'value5',
                'Côlümn wíth âccénts': 'value6'
            };

            const errors = DataValidator.validateRowData(dataWithSpecialChars);
            expect(errors).toHaveLength(0);
        });

        it('should handle large datasets efficiently', () => {
            const largeData: Record<string, any> = {};

            // Créer un objet avec beaucoup de colonnes
            for (let i = 0; i < 1000; i++) {
                largeData[`Column${i}`] = `Value${i}`;
            }

            const startTime = Date.now();
            const errors = DataValidator.validateRowData(largeData);
            const endTime = Date.now();

            expect(errors).toHaveLength(0);
            expect(endTime - startTime).toBeLessThan(100); // Should be fast
        });

        it('should provide detailed error messages', () => {
            const invalidData = {
                '': 'empty name',
                'Valid': 'good',
                'Object': { nested: 'object' },
                ' ': 'space name'
            };

            const errors = DataValidator.validateRowData(invalidData);

            // Vérifier que les messages d'erreur sont descriptifs
            expect(errors.some(error => error.includes('empty name'))).toBe(false);
            expect(errors.some(error => error.includes('Object'))).toBe(true);
            expect(errors.some(error => error.includes('Unsupported value type'))).toBe(true);
        });

        it('should handle edge cases', () => {
            const edgeCases = {
                'Function': () => 'test', // Functions should be rejected
                'Date': new Date(), // Dates should be rejected
                'RegExp': /test/, // RegExp should be rejected
                'Symbol': Symbol('test') // Symbols should be rejected
            };

            const errors = DataValidator.validateRowData(edgeCases);
            expect(errors.length).toBeGreaterThan(0);
        });
    });
});