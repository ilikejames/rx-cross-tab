export class Logger {
    constructor(private name: string) {}

    createLogger(name: string) {
        return new Logger([this.name, name].join('/'));
    }

    private log(...args: any[]) {
        return [this.name, Date.now(), ...args];
    }

    debug(...args: any[]) {
        console.debug(...this.log(...args));
    }

    info(...args: any[]) {
        console.info(...this.log(...args));
    }

    warn(...args: any[]) {
        console.warn(...this.log(...args));
    }

    error(...args: any[]) {
        console.error(...this.log(...args));
    }
}

export const rootLogger = new Logger('rx-tab-dublex');
