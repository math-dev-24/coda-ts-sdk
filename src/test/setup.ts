import { config } from 'dotenv';

config({ path: '.env.test' });

jest.mock('node-fetch');

process.env.CODA_API_TOKEN = 'test_token_1234567890abcdef';
process.env.NODE_ENV = 'test';

const originalConsole = global.console;

beforeAll(() => {
    global.console = {
        ...originalConsole,
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    };
});

afterAll(() => {
    global.console = originalConsole;
});