import { BroadcastChannel } from 'broadcast-channel';
import { Subject } from 'rxjs';
import { share, take } from 'rxjs/operators';
import { settings } from '../settings';
import { flatten } from 'lodash';
import { leader$ } from '../leader';
import { rootLogger } from './logger';

const logger = rootLogger.createLogger('request-channel');

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

logger.info(`Creating channel "${settings.subscriptionChannel}"`);
let channel: BroadcastChannel<Request>;

export const requestEvent$ = requestEvent.pipe(share());

export const startSubscriptionChannel = () => {
    if (!channel) {
        channel = new BroadcastChannel<Request>(settings.subscriptionChannel);

        /**
         * Subscribe to request from other tabs.
         * When a instance goes from follower -> leader, we use this to know what to sub and post
         */
        channel.addEventListener('message', e => {
            logger.debug('Message', e);
            onRequest(e);
        });
    }
    return () => channel && channel.close();
};

requestEvent$.subscribe();

export const request = (request: Request) => {
    logger.debug('Broadcasting to other nodes a new subscription request', request);
    channel.postMessage(request);
    // When leader, this will not receive
    leader$.pipe(take(1)).subscribe(leader => {
        if (leader) {
            logger.debug('Broadcasting to self', request);
            onRequest(request);
        }
    });
};

export const getSubscriptionRequests = (): Request[] => {
    return flatten(Array.from(subscriptionRequests.values()));
};

const onRequest = (request: Request) => {
    const requests = subscriptionRequests.get(request.name) || [];
    const existing = requests.find(x => x.id === request.id);
    const other = requests.filter(x => x.id !== request.id);

    let count = 0;

    switch (request.action) {
        case 'subscribe': {
            if (existing) {
                count = (existing.count ?? 0) + 1;
                logger.debug('Inc existing subscriptions', request.name, count);
                subscriptionRequests.set(request.name, [...other, { ...existing, count }]);
            } else {
                count = 1;
                logger.debug('First subscription', request.name);
                subscriptionRequests.set(request.name, [...other, { ...request, count }]);
            }
            break;
        }
        case 'unsubscribe': {
            count = existing?.count ? existing.count : 0;
            if (existing && count > 1) {
                count -= 1;
                logger.debug('Dec subscriptions', request.name, count);
                subscriptionRequests.set(request.name, [...other, { ...existing, count }]);
            } else {
                count = 0;
                logger.debug('Cancelling subscriptions', request.name);
                subscriptionRequests.set(request.name, other);
            }
        }
    }

    requestEvent.next({ ...request, count });
};
