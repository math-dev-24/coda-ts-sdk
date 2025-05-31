export enum LogLevel {
    NONE = 0,
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    DEBUG = 4
}

export class Logger {
    constructor(private level: LogLevel = LogLevel.ERROR) {}

    setLevel(level: LogLevel): void {
        this.level = level;
    }

    private formatMessage(level: string, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [CODA-SDK ${level}] ${message}`;
    }

    error(message: string, ...args: any[]): void {
        if (this.level >= LogLevel.ERROR) {
            console.error(this.formatMessage('ERROR', message), ...args);
        }
    }

    warn(message: string, ...args: any[]): void {
        if (this.level >= LogLevel.WARN) {
            console.warn(this.formatMessage('WARN', message), ...args);
        }
    }

    info(message: string, ...args: any[]): void {
        if (this.level >= LogLevel.INFO) {
            console.info(this.formatMessage('INFO', message), ...args);
        }
    }

    debug(message: string, ...args: any[]): void {
        if (this.level >= LogLevel.DEBUG) {
            console.log(this.formatMessage('DEBUG', message), ...args);
        }
    }
}