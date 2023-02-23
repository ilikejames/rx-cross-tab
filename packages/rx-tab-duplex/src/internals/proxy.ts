import { BroadcastChannel } from 'broadcast-channel'
import { Observable, Subject, shareReplay } from 'rxjs'
import { Logger } from './logger'
import { source$Map } from './sourceMap'

type ProxyPair<T> = [Observable<T>, Subject<T>]

const proxyCache = new Map<string, ProxyPair<unknown>>()

export const hasProxy = (name: string) => proxyCache.has(name)
export const getProxy = <T>(name: string) => proxyCache.get(name) as ProxyPair<T>

export const createSourceProxy = <T>(
    name: string,
    source$: Observable<T>,
    channel: BroadcastChannel<T>,
    rootLogger: Logger,
): ProxyPair<T> => {
    const logger = rootLogger.createLogger('proxy')

    if (!source$Map.has(name)) {
        source$Map.set(name, source$)
    }

    if (proxyCache.has(name)) {
        logger.debug('Reusing existing proxy')
        return proxyCache.get(name)! as ProxyPair<T>
    }

    logger.info('Creating new proxy')
    const proxy = new Subject<T>()
    const proxy$ = proxy.pipe(shareReplay(1))
    proxyCache.set(name, [proxy$, proxy as Subject<unknown>])

    channel.addEventListener('message', e => {
        logger.debug('New channel event. Emitting to this instances subscribers.', e)
        proxy.next(e)
    })

    return [proxy$, proxy]
}
