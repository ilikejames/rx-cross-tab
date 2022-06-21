import { BroadcastChannel } from 'broadcast-channel';
import { Subject } from 'rxjs';
import { share, tap } from 'rxjs/operators';
import { settings } from './settings';
import { flatten } from 'lodash';

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

let channel = new BroadcastChannel<Request>(settings.subscriptionChannel);

export const requestEvent$ = requestEvent.pipe(
    tap(v => {
        console.log('requestEvent$', v);
    }),
    share(),
);

export const request = (r: Request) => {
    channel.postMessage(r);
};

export const getSubscriptionRequests = (): Request[] => {
    return flatten(Array.from(subscriptionRequests.values()));
};

/**
 * Subscribe to request from other tabs.
 * When a instance goes from follower -> leader, we use this to know what to sub and post
 */

export const create = () => {
    channel.addEventListener('message', e => {
        const requests = subscriptionRequests.get(e.name) || [];
        const existing = requests.find(x => x.id === e.id);
        const other = requests.filter(x => x.id !== e.id);

        let count = 0;

        switch (e.action) {
            case 'subscribe': {
                if (existing) {
                    count = (existing.count ?? 0) + 1;
                    subscriptionRequests.set(e.name, [...other, { ...existing, count }]);
                } else {
                    count = 1;
                    subscriptionRequests.set(e.name, [...other, { ...e, count }]);
                }
                break;
            }
            case 'unsubscribe': {
                count = existing?.count ? existing.count : 0;
                if (existing && count > 1) {
                    count -= 1;
                    subscriptionRequests.set(e.name, [...other, { ...existing, count }]);
                } else {
                    count = 0;
                    subscriptionRequests.set(e.name, other);
                }
            }
        }

        requestEvent.next({ ...e, count });
    });
};
