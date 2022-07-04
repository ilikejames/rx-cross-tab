export const TIMEOUT = 'timeout';

export const timeout = (ms: number) => {
    return new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(TIMEOUT);
        }, ms);
    });
};
