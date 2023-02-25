export const testValues = {
    getInteger: (key: string, defaultValue?: number) => {
        const v = sessionStorage.getItem(key)
        console.log('getInteger', key, v)
        try {
            const n = v ? parseInt(v) : undefined
            return Number.isInteger(n) ? n : defaultValue
        } catch {
            return defaultValue
        }
    },
    getString: (key: string, defaultValue?: string) => {
        const v = sessionStorage.getItem(key)
        return v ?? defaultValue
    },
}
