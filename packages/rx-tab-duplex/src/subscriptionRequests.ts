import { BroadcastChannel } from 'broadcast-channel';
import { Subject } from 'rxjs';
import { share, tap, take } from 'rxjs/operators';
import { settings } from './settings';
import { flatten } from 'lodash';
import { leader$ } from './leader';

/**
 * Communication network for requests to different streams.
 * Emits new events for current leader.
 * And keeps a map of required subscriptions for a newly elected leader.
 */

const requestEvent = new Subject<Request>();

export interface Request {
    id: string;
    name: string;
    action: 'subscribe' | 'unsubscribe';
    count?: number;
}

const subscriptionRequests = new Map<string, Request[]>();

console.log(`Creating channel "${settings.subscriptionChannel}"`);
let channel = new BroadcastChannel<Request>(settings.subscriptionChannel);

console.log('channel', channel);
export const requestEvent$ = requestEvent.pipe(share());

requestEvent$.subscribe();

export const request = (request: Request) => {
    channel.postMessage(request);
    // When leader, this will not receive
    leader$.pipe(take(1)).subscribe(leader => {
        if (leader) {
            onRequest(request);
        }
    });
};

export const getSubscriptionRequests = (): Request[] => {
    return flatten(Array.from(subscriptionRequests.values()));
};

/**
 * Subscribe to request from other tabs.
 * When a instance goes from follower -> leader, we use this to know what to sub and post
 */

export const create = () => {};

channel.addEventListener('message', e => {
    console.log('com channel', e);
    onRequest(e);
});

const onRequest = (request: Request) => {
    const requests = subscriptionRequests.get(request.name) || [];
    const existing = requests.find(x => x.id === request.id);
    const other = requests.filter(x => x.id !== request.id);

    let count = 0;

    switch (request.action) {
        case 'subscribe': {
            if (existing) {
                count = (existing.count ?? 0) + 1;
                subscriptionRequests.set(request.name, [...other, { ...existing, count }]);
            } else {
                count = 1;
                subscriptionRequests.set(request.name, [...other, { ...request, count }]);
            }
            break;
        }
        case 'unsubscribe': {
            count = existing?.count ? existing.count : 0;
            if (existing && count > 1) {
                count -= 1;
                subscriptionRequests.set(request.name, [...other, { ...existing, count }]);
            } else {
                count = 0;
                subscriptionRequests.set(request.name, other);
            }
        }
    }

    requestEvent.next({ ...request, count });
};
