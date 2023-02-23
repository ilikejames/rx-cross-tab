import { BroadcastChannel } from 'broadcast-channel'
import { NEVER, Observable, Subscription } from 'rxjs'
import { rootLogger } from './logger'
import { getProxy, hasProxy } from './proxy'
import { source$Map } from './sourceMap'
import { Request, request } from './subscriptionRequests'

const logger = rootLogger.createLogger('requests')
const subscriptions = new Map<string, Subscription>()

export const onNewSubscriptionRequest = <T>(event: Request, channel: BroadcastChannel<T>) => {
    logger.debug('New', event)
    const name = event.name
    const existingSubscription = subscriptions.get(name)

    if (event.action === 'unsubscribe') {
        if (event.count === 0) {
            if (existingSubscription) {
                existingSubscription.unsubscribe()
                subscriptions.delete(name)
            }
        }
        return NEVER
    }
    if (existingSubscription && !existingSubscription.closed) {
        return NEVER
    }
    const source = source$Map.get(name) as Observable<T>
    if (!source) {
        logger.warn(`No source named "${name}"`)
        return NEVER
    }
    // we might have a subscription...
    const subscription = source.subscribe({
        next: v => {
            channel.postMessage(v)
            if (!hasProxy(name)) {
                logger.error(`No proxy for "${name}". This will not work.`)
            } else {
                const [, proxy] = getProxy(name)
                proxy.next(v)
            }
        },
        complete: () => {
            request({
                id: event.id,
                action: 'unsubscribe',
                name,
            })
        },
        error: e => {
            logger.error(e)
        },
    })
    subscriptions.set(name, subscription)
}
