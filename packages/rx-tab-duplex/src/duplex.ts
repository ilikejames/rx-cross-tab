import { leader$ } from './leader';
import {
    filter,
    Observable,
    Subject,
    switchMap,
    share,
    withLatestFrom,
    NEVER,
    Subscription,
    tap,
    from,
    shareReplay,
} from 'rxjs';
import { requestEvent$, request, Request, getSubscriptionRequests } from './subscriptionRequests';
import { BroadcastChannel } from 'broadcast-channel';
import { internalId } from './internalId';

const uniqueNames = new Set<string>();

const channelStreamMap = new Map<string, Observable<unknown>>();
const subjectMap = new Map<string, Subject<any>>();
const sourceStreamMap = new Map<string, Observable<unknown>>();
const channelMap = new Map<string, BroadcastChannel<any>>();
const subscriptions = new Map<string, Subscription>();

leader$
    .pipe(
        tap(l => console.log('leader =', l)),
        filter(leader => leader),
        tap(() => console.log('I have become the leader')),
        switchMap(() => {
            const requestsToResubscribe = getSubscriptionRequests();
            return from(requestsToResubscribe);
        }),
        tap(event => {
            console.log(`New leader. Subscribing to "${name}"`);
            const channel = getChannel<unknown>(event.name);
            onNewSubscriptionRequest(event, channel);
        }),
    )
    .subscribe();

const getChannel = <T>(name: string) => {
    if (!channelMap.has(name)) {
        channelMap.set(name, new BroadcastChannel<T>(name, {}));
    }
    return channelMap.get(name) as BroadcastChannel<T>;
};

export const duplex = <T>(name: string, o: Observable<T>): Observable<T> => {
    if (uniqueNames.has(name)) {
        console.warn(`"${name}" is not unique`);
    }

    const channel = getChannel<T>(name);

    // Subscribe to new requests
    // When an instance wants this wrapped subscription, subscribe and broadcast the results
    requestEvent$
        .pipe(
            tap(v => console.log('new requestEvent', v)),
            filter(e => e.name === name),
            // only when leader
            withLatestFrom(leader$.pipe(filter(leader => leader))),
            tap(([event]) => {
                onNewSubscriptionRequest(event, channel);
            }),
        )
        .subscribe();

    return leader$.pipe(
        switchMap(leader => {
            request({
                id: internalId,
                action: 'subscribe',
                name,
            });

            if (!sourceStreamMap.has(name)) {
                sourceStreamMap.set(name, o);
            }

            if (channelStreamMap.has(name)) {
                console.log('has existing channelStreamMap', name);
                return channelStreamMap.get(name) as Observable<T>;
            }

            console.log('! creating channelStreamMap', name);
            // Subscribe to events
            const sub = new Subject<T>();
            subjectMap.set(name, sub);
            const stream$ = sub.pipe(shareReplay(1));
            // stream$.subscribe();
            channelStreamMap.set(name, stream$);

            channel.addEventListener('message', e => {
                console.log('new event', name, e);
                sub.next(e);
            });
            return stream$;
        }),
    );
};

// const getNewRequest$ = <T>(name: string, channel: BroadcastChannel<T>) => {
//     // When an instance wants this wrapped subscription, subscribe and broadcast the results
//     return requestEvent$.pipe(
//         filter(e => e.name === name),
//         withLatestFrom(leader$.pipe(filter(leader => leader))),
//         // Just expose inner method
//         tap(([event, leader]) => {
//             onNewSubscriptionRequest(name, event, channel)
//         }),
//     );
// };

const onNewSubscriptionRequest = <T>(event: Request, channel: BroadcastChannel<T>) => {
    console.log(event);
    const name = event.name;
    const existingSubscription = subscriptions.get(name);

    if (event.action === 'unsubscribe') {
        if (event.count === 0) {
            if (existingSubscription) {
                existingSubscription.unsubscribe();
                subscriptions.delete(name);
            }
        }
        return NEVER;
    }
    if (existingSubscription && !existingSubscription.closed) {
        return NEVER;
    }
    const source = sourceStreamMap.get(name) as Observable<T>;
    if (!source) {
        console.warn(`No source named "${name}"`);
        return NEVER;
    }
    // we might have a subscription...
    const subscription = source.subscribe({
        next: v => {
            channel.postMessage(v);
            subjectMap.get(event.name)!.next(v);
        },
        complete: () => {
            request({
                id: event.id,
                action: 'unsubscribe',
                name,
            });
        },
        error: e => {
            console.error(e);
        },
    });
    subscriptions.set(name, subscription);
};
