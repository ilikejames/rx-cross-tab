export * from './duplex';
import { startLeadershipHandler } from './leader';
import { startSubscriptionChannel } from './internals/subscriptionRequests';

export const create = () => {
    startSubscriptionChannel();
    startLeadershipHandler();
};
