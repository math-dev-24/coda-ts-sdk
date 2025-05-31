import {CodaApiError} from "./coda.type";

export class CodaRateLimitError extends CodaApiError {
    constructor(public retryAfter: number) {
        super('Rate limit exceeded', 429);
    }
}

export class CodaValidationError extends CodaApiError {
    constructor(public validationErrors: string[]) {
        super('Validation failed', 400);
    }
}