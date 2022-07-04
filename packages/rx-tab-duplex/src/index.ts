export * from './duplex';
import { startSubscriptionChannel } from './internals/subscriptionRequests';
import { startup } from 'rx-tab-leader';

export const create = () => {
    startSubscriptionChannel();
    startup();
};
