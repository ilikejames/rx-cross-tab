import { Connection, ProtocolHandler, ServiceDefinition } from '@fakehost/exchange'
import { Observable, Subscription } from 'rxjs'

type IncomingMessageType = 'REQUEST' | 'COMPLETED' | 'CANCEL'
type OutgoingMessageType = 'NEXT' | 'COMPLETED' | 'ERROR'

export type IncomingServiceMessage = {
    correlationId: string
    type: IncomingMessageType
    service: string
    payload: unknown
}

type OutgoingServiceMessage = {
    correlationId: string
    type: OutgoingMessageType
    service: string
    payload?: unknown
}

export type TestServiceDefinition = ServiceDefinition<Pick<IncomingServiceMessage, 'service'>>

export type SubscriptionHandler = (input: unknown) => Observable<unknown>

export class TestHost implements ProtocolHandler<IncomingServiceMessage, OutgoingServiceMessage> {
    private serviceHandlers = new Map<string, { service: string; handler: SubscriptionHandler }>()
    private subscriptions = new Map<string, Subscription>()

    serialize(message: OutgoingServiceMessage): string {
        return JSON.stringify(message)
    }

    deserialize(buffer: string | Buffer): IncomingServiceMessage {
        const message = typeof buffer === 'string' ? buffer : new TextDecoder('utf-8').decode(buffer)
        return JSON.parse(message) as IncomingServiceMessage
    }

    onMessage(connection: Connection, message: IncomingServiceMessage): void {
        switch (message.type) {
            case 'CANCEL':
            case 'COMPLETED':
            case 'REQUEST': {
                const match = this.serviceHandlers.get(message.service)
                if (!match) {
                    return console.error(`No handler for "${message.service}"`)
                }
                const response$ = match.handler(message.payload)
                const subscription = response$.subscribe({
                    next: (responsePayload: unknown) => {
                        const outgoingMessage: OutgoingServiceMessage = {
                            correlationId: message.correlationId,
                            service: message.service,
                            type: 'NEXT',
                            payload: responsePayload,
                        }
                        connection.write(this.serialize(outgoingMessage))
                    },
                    complete: () => {
                        const completeMessage: OutgoingServiceMessage = {
                            correlationId: message.correlationId,
                            type: 'COMPLETED',
                            service: message.service,
                        }
                        connection.write(this.serialize(completeMessage))
                    },
                    error: (error: unknown) => {
                        const errorMessage: OutgoingServiceMessage = {
                            correlationId: message.correlationId,
                            service: message.service,
                            type: 'ERROR',
                            payload: error,
                        }
                        connection.write(this.serialize(errorMessage))
                    },
                })
                this.subscriptions.set(message.correlationId, subscription)
            }
        }
    }

    subscribe(definition: TestServiceDefinition): void {
        const { service } = definition.destination
        this.serviceHandlers.set(service, {
            service,
            handler: definition.handler as SubscriptionHandler,
        })
    }
}
