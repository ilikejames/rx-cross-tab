import { Observable, Subject, distinctUntilChanged, filter, switchMap, tap } from 'rxjs'
import {
    createSourceProxy,
    getChannel,
    getProxy,
    hasProxy,
    internalId,
    onNewSubscriptionRequest,
    request,
    requestEvent$,
    rootLogger,
} from './internals'
import { leader$ } from './leader'

const uniqueNames = new Set<string>()

//type DuplexPair<T> = [Observable<T>, (next: T) => void];

export const broadcast = <T, S extends Subject<T>>(name: string, subject: S) => {
    const channel = getChannel<T>(name)
    // const originalNext = subject.next.bind(subject);
    // const next = (value: T) => {
    //     channel.postMessage(value);
    //     originalNext(value);
    // };
    // const extended = Object.defineProperty(subject, 'broadcast', {
    //     value: function (value: T) {
    //         console.log('setting value', value);
    //         channel.postMessage(value);
    //         subject.next(value);
    //     },
    // });
    const f = function (value: T) {
        console.log('setting value', value)
        channel.postMessage(value)
        subject.next(value)

        if (hasProxy(name)) {
            const [, proxy] = getProxy<T>(name)
            proxy.next(value)
        }
    }
    return f
}

export const duplex = <T>(name: string, source$: Observable<T>): Observable<T> => {
    const logger = rootLogger.createLogger(name)

    if (uniqueNames.has(name)) {
        logger.warn(`"${name}" is not unique`)
    }

    const channel = getChannel<T>(name)

    // Subscribe to new requests for this event.name
    // When an instance wants this wrapped subscription,
    // the leaders will subscribe and broadcast the results.
    // TODO: not sure this is correct when there is multiple listeners to the same "name"
    leader$
        .pipe(
            filter(leader => leader),
            distinctUntilChanged(),
            tap(() => logger.debug('Leader. Ready for new subscription requests')),
            switchMap(() => requestEvent$),
            filter(e => e.name === name),
            tap(v => logger.debug('Leader. New subscription request', v)),
        )
        .subscribe(e => {
            onNewSubscriptionRequest(e, channel)
        })

    logger.debug('Broadcasting new subscription request to across nodes')
    request({
        id: internalId,
        action: 'subscribe',
        name,
    })

    const [proxy$] = createSourceProxy(name, source$, channel, logger)
    return proxy$
}
