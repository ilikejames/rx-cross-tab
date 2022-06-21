import { describe, test, expect, vi, MockedObject, beforeEach, afterEach } from 'vitest';
import { create, getSubscriptionRequests, Request, requestEvent$ } from './subscriptionRequests';
import { BroadcastChannel } from 'broadcast-channel';
import { bufferCount, firstValueFrom, take } from 'rxjs';

describe('subscriptionRequests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mock('broadcast-channel', () => {
            const bc = vi.fn();
            let handlers = new Array<any>();
            const addEventListener: BroadcastChannel['addEventListener'] = vi.fn((_, handler) => {
                handlers.push(handler);
            });
            const postMessage = vi.fn(message => handlers.forEach(h => h(message)));

            bc.prototype.addEventListener = addEventListener;
            bc.prototype.postMessage = postMessage;
            bc.prototype.onMessage = vi.fn();
            bc.prototype.reset = vi.fn(() => (handlers = new Array<any>()));
            return { BroadcastChannel: bc };
        });
        create();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    type MockedBroadcastChannel = MockedObject<BroadcastChannel<Request> & { reset: () => void }>;

    test('maintains number of increasing subscriptions to a topic', async () => {
        const bc = new BroadcastChannel('none') as MockedBroadcastChannel;
        const before = getSubscriptionRequests().find(x => x.name === 'name1')?.count || 0;

        try {
            bc.postMessage({
                id: `1`,
                name: 'name1',
                action: 'subscribe',
            });

            expect(getSubscriptionRequests()).toMatchObject([
                {
                    id: `1`,
                    name: 'name1',
                    action: 'subscribe',
                    count: before + 1,
                },
            ]);

            bc.postMessage({
                id: `1`,
                name: 'name1',
                action: 'subscribe',
            });

            expect(getSubscriptionRequests()).toMatchObject([
                {
                    id: `1`,
                    name: 'name1',
                    action: 'subscribe',
                    count: before + 2,
                },
            ]);
        } finally {
            bc.reset();
        }
    });

    test('maintains number of decreasing subscriptions to a topic', async () => {
        const bc = new BroadcastChannel('none') as MockedBroadcastChannel;
        const name = 'name1';
        const before = getSubscriptionRequests().find(x => x.name === name)?.count || 0;
        try {
            bc.postMessage({
                id: `1`,
                name,
                action: 'subscribe',
            });
            bc.postMessage({
                id: `1`,
                name,
                action: 'subscribe',
            });

            expect(getSubscriptionRequests()).toMatchObject([
                {
                    id: `1`,
                    name,
                    action: 'subscribe',
                    count: before + 2,
                },
            ]);

            bc.postMessage({
                id: `1`,
                name,
                action: 'unsubscribe',
            });

            expect(getSubscriptionRequests()).toMatchObject([
                {
                    id: `1`,
                    name,
                    action: 'subscribe',
                    count: before + 2 - 1,
                },
            ]);

            bc.postMessage({
                id: `1`,
                name: 'name1',
                action: 'unsubscribe',
            });

            expect(getSubscriptionRequests()).toMatchObject([
                {
                    id: `1`,
                    name,
                    action: 'subscribe',
                    count: before + 2 - 2,
                },
            ]);
        } finally {
            bc.reset();
        }
    });

    test('requestEvent$', async () => {
        const bc = new BroadcastChannel('none') as MockedBroadcastChannel;
        const before = getSubscriptionRequests().find(x => x.name === 'name1')?.count || 0;
        const buffer1Promise = firstValueFrom(requestEvent$.pipe(bufferCount(1), take(1)));
        bc.postMessage({
            id: `1`,
            name: 'name1',
            action: 'subscribe',
        });

        expect(await buffer1Promise).toMatchObject([
            {
                id: `1`,
                name: 'name1',
                action: 'subscribe',
                count: before + 1,
            },
        ]);

        const numberToRemove = before + 1;
        const buffer2Promise = firstValueFrom(
            requestEvent$.pipe(bufferCount(numberToRemove), take(1)),
        );
        new Array(numberToRemove).fill(0).forEach(async => {
            bc.postMessage({
                id: `1`,
                name: 'name1',
                action: 'unsubscribe',
            });
        });
        const result = await buffer2Promise;
        const [last] = result.reverse();
        expect(last).toMatchObject({
            id: `1`,
            name: 'name1',
            action: 'unsubscribe',
            count: 0,
        });
    });
});
