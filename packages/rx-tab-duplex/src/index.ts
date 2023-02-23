import { startup } from 'rx-tab-leader'
import { startSubscriptionChannel } from './internals/subscriptionRequests'

export * from './duplex'

export const create = () => {
    startSubscriptionChannel()
    startup()
}

export { leader$ } from './leader'
