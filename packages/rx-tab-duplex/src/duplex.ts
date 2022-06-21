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
} from 'rxjs';
import { requestEvent$, request } from './subscriptionRequests';
import { BroadcastChannel } from 'broadcast-channel';
import { internalId } from './internalId';

const uniqueNames = new Set<string>();

const channelStreamMap = new Map<string, Observable<unknown>>();
const sourceStreamMap = new Map<string, Observable<unknown>>();
const channelMap = new Map<string, BroadcastChannel<any>>();
const subscriptions = new Map<string, Subscription>();

export const duplex = <T>(name: string, o: Observable<T>): Observable<T> => {
    if (uniqueNames.has(name)) {
        console.warn(`"${name}" is not unique`);
    }

    if (!channelMap.has(name)) {
        channelMap.set(name, new BroadcastChannel<T>(name));
    }
    const channel = channelMap.get(name) as BroadcastChannel<T>;

    // When an instance wants this wrapped subscription, subscribe and broadcast the results
    requestEvent$
        .pipe(
            filter(e => e.name === name),
            withLatestFrom(leader$),
            tap(([event, leader]) => {
                console.log('event', 'leader =', leader);
                if (!leader) return;
                console.log(event);
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
                // we might have a subsciption...
                const subscription = source.subscribe({
                    next: v => {
                        channel.postMessage(v);
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
            }),
        )
        .subscribe();

    return leader$.pipe(
        switchMap(() => {
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

            console.log('creating channelStreamMap', name);
            // Subscribe to events
            const sub = new Subject<T>();
            const stream$ = sub.pipe(share());
            channelStreamMap.set(name, stream$);

            channel.addEventListener('message', e => {
                console.log('new event', name, e);
                sub.next(e);
            });
            return stream$;
        }),
    );
};
