export interface Message<T extends string> {
    correlationId: string
    from: string
    topic: T
    payload: unknown
}
