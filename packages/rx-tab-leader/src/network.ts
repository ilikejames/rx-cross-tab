import { BroadcastChannel } from 'broadcast-channel'
import { Observable, filter, fromEvent, share, take, tap } from 'rxjs'
import { v4 as uuid } from 'uuid'
import { internalId } from './internalId'
import { rootLogger } from './logger'
import { Message, Messages, TopicType } from './types'

const logger = rootLogger.createLogger('network')

const channel = new BroadcastChannel<Messages>('com_network')

const message$ = fromEvent(channel, 'message').pipe(share())

export const requestResponse = ({ topic, payload }: Pick<Messages, 'topic' | 'payload'>) => {
    return requestStream({ topic, payload }).pipe(take(1))
}

export const requestStream = ({ topic, payload }: Pick<Messages, 'topic' | 'payload'>) => {
    const request: Message<typeof topic> = {
        from: internalId,
        topic,
        payload,
        correlationId: uuid(),
    }
    logger.debug('requestStream', request)
    channel.postMessage(request as Messages)
    return message$.pipe(
        filter(message => message.correlationId === request.correlationId),
        tap(r => {
            logger.debug('requestStream', 'next', r)
        }),
    )
}

export const subscribeToTopic = <R extends Messages>(topic: TopicType): Observable<R> => {
    return message$.pipe(filter(message => message.topic === topic)) as Observable<R>
}

export const sendToTopic = (topic: TopicType, payload: unknown) => {
    const message: Message<typeof topic> = {
        from: internalId,
        topic,
        payload,
        correlationId: uuid(),
    }
    channel.postMessage(message as Messages)
}

export const sendToCorrelation = (correlationId: string, topic: TopicType, payload: unknown) => {
    const message: Message<typeof topic> = {
        from: internalId,
        topic,
        payload,
        correlationId,
    }
    channel.postMessage(message as Messages)
}
