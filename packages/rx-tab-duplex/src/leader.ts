import { filter, tap, switchMap, from, Subscription } from 'rxjs';
import { getSubscriptionRequests, getChannel, onNewSubscriptionRequest } from './internals';
import { rootLogger } from './internals';
import { createLeaderElection, BroadcastChannel } from 'broadcast-channel';
import { BehaviorSubject, shareReplay } from 'rxjs';
import { settings } from './settings';

const logger = rootLogger.createLogger('leadership');

const leader = new BehaviorSubject<boolean>(false);
export const leader$ = leader.pipe(shareReplay(1));

let subscription: Subscription;

export const startLeadershipHandler = () => {
    if (!subscription) {
        logger.info('Starting leadership election');
        const channel = new BroadcastChannel(settings.leadershipChannel);
        const election = createLeaderElection(channel);

        const followerPromise = new Promise<void>(resolve => {
            setTimeout(() => {
                if (!election.isLeader) {
                    logger.info('Follower');
                }
                resolve();
            }, settings.leadershipTimeout);
        });

        const electSelf = election.awaitLeadership().then(() => {
            logger.info('Leader');
            leader.next(election.isLeader);
        });

        Promise.race([electSelf, followerPromise]);

        // Subscription to follower node' requests when become leader
        subscription = leader$
            .pipe(
                filter(leader => leader),
                tap(() => logger.info('I have become the leader')),
                switchMap(() => {
                    // Now this instance is the leader, get existing subscription requirements
                    // subscribe and start broadcasting
                    const requestsToResubscribe = getSubscriptionRequests();
                    logger.info(
                        `Subscribing to "${requestsToResubscribe.length}" existing requests`,
                    );
                    return from(requestsToResubscribe);
                }),
                tap(event => {
                    logger.info(`Subscribing to "${event.name}"`);
                    const channel = getChannel<unknown>(event.name);
                    onNewSubscriptionRequest(event, channel);
                }),
            )
            .subscribe();
    }
    return () => subscription.unsubscribe();
};
