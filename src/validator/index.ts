export class DataValidator {

    static validateRowData(data: Record<string, any>): string[] {
        const errors: string[] = [];

        Object.entries(data).forEach(([key, value]) => {
            if (typeof key !== 'string' || key.trim() === '') {
                errors.push(`Name of column "${key}" is invalid`);
            }

            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                errors.push(`Unsupported value type for column "${key}"`);
            }
        });
        return errors;
    }
}