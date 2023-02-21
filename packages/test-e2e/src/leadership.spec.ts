import { test, expect, Page, BrowserContext } from '@playwright/test';
import { init } from './config';
import { waitUntil, log } from './helper';

test.describe('leadership', () => {
    let env: Awaited<ReturnType<typeof init>>;

    test.beforeEach(async ({ page }) => {
        env = await init();
    });

    test.afterEach(() => env.dispose());

    test('with multiple opening an election is held to find the leader', async ({ context }) => {
        const tabNames = ['a', 'b', 'c'];
        log.when('Opening tabs', tabNames);
        const instances = await Promise.all(
            tabNames.map(name => createInstance(env.url, name, context)),
        );

        await waitForElectionResults(instances);
        const results = await getAllLeadershipStatus(instances);

        expect(results.filter(r => r.status === 'LEADER')).toHaveLength(1);
        const leaderTab = results.find(r => r.status === 'LEADER')!;
        expect(leaderTab.leader).toEqual(leaderTab.iam);
        const followerTabs = results.filter(r => r.status === 'FOLLOWER');
        expect(followerTabs).toHaveLength(2);
        followerTabs.every(f => expect(f.leader).toEqual(leaderTab.iam));
    });

    test('with multiple open and new tabs join', async ({ context }) => {
        const tabNames = ['a', 'b', 'c'];
        log.when('Opening tabs', tabNames);
        const instances = await Promise.all(
            tabNames.map(name => createInstance(env.url, name, context)),
        );
        await waitForElectionResults(instances);

        const originalStatus = await getAllLeadershipStatus(instances);
        const originalLeader = originalStatus.find(r => r.status === 'LEADER')!;

        const newTabs = ['d', 'e'];
        log.when('Opening more tabs', newTabs);
        const newInstances = await Promise.all(
            newTabs.map(name => createInstance(env.url, name, context)),
        );
        await waitForElectionResults(newInstances);
        const results = await getAllLeadershipStatus([...instances, ...newInstances]);

        expect(results.filter(r => r.status === 'LEADER')).toHaveLength(1);
        expect(results.find(r => r.status === 'LEADER')?.iam).toEqual(originalLeader.iam);

        newTabs.forEach(name => {
            const instance = results.find(r => r.iam === name)!;
            expect(instance).toBeDefined();
            expect(instance.status).toEqual('FOLLOWER');
            expect(instance.leader).toEqual(originalLeader.iam);
        });
    });

    test('when a leader leaves', async ({ context }) => {
        const tabNames = ['a', 'b', 'c', 'd', 'e'];
        log.when(`Opening tabs "${tabNames}"`);
        const instances = await Promise.all(
            tabNames.map(name => createInstance(env.url, name, context)),
        );
        await waitForElectionResults(instances);
        const initial = await getAllLeadershipStatus(instances);

        const initialLeader = initial.find(r => r.status === 'LEADER')!;
        const leaderIndex = initial.findIndex(r => r.status === 'LEADER');
        log.when(`Closing leader tab ${leaderIndex} "${initialLeader.iam}"`);

        await instances[leaderIndex].close({ runBeforeUnload: true });

        const afterInstances = instances.filter((_, i) => i !== leaderIndex);
        await waitForLeader(afterInstances);
        const results = await getAllLeadershipStatus(afterInstances);

        expect(results.filter(r => r.status === 'LEADER')).toHaveLength(1);
        const newLeaderTab = results.find(r => r.status === 'LEADER')!;
        const followerTabs = results.filter(r => r.status === 'FOLLOWER');
        expect(followerTabs).toHaveLength(afterInstances.length - 1);
        followerTabs.every(f => expect(f.leader).toEqual(newLeaderTab.iam));

        log.then('Closing another tab...');
        const newLeaderIndex = results.findIndex(r => r.status === 'LEADER');
        log.when(`Closing the new leader tab ${newLeaderIndex} "${newLeaderTab.iam}"`);
        await afterInstances[newLeaderIndex].close({ runBeforeUnload: true });

        const finalInstances = afterInstances.filter((_, i) => i !== newLeaderIndex);
        await waitForLeader(finalInstances);
        const finalResults = await getAllLeadershipStatus(finalInstances);

        expect(finalResults.filter(r => r.status === 'LEADER')).toHaveLength(1);
        const finalLeaderTab = finalResults.find(r => r.status === 'LEADER')!;
        const finalFollowerTabs = finalResults.filter(r => r.status === 'FOLLOWER');
        expect(finalFollowerTabs).toHaveLength(finalInstances.length - 1);
        finalFollowerTabs.every(f => expect(f.leader).toEqual(finalLeaderTab.iam));
    });
});

const createInstance = async (url: string, name: string, context: BrowserContext) => {
    const page = await context.newPage();
    await page.addInitScript((name: string) => sessionStorage.setItem('tabId', name), [name]);
    await page.goto(url);
    return page;
};

const getLeadershipStatus = async (instance: Page) => {
    const status = await instance.getAttribute('input[name="status"]', 'value');
    const iam = await instance.getAttribute('input[name="iam"]', 'value');
    const leader = await instance.getAttribute('input[name="leader"]', 'value');
    return { iam, status, leader };
};

const getAllLeadershipStatus = async (instances: Page[], options = { silent: false }) => {
    const results: LeaderStatus[] = [];
    for (const instance of instances) {
        const instanceStatus = await getLeadershipStatus(instance);
        if (!options.silent) {
            log.data(instanceStatus);
        }
        results.push(instanceStatus);
    }
    return results;
};

const waitForElectionResults = async (instances: Page[]) => {
    log.when('Waiting for election results');
    await waitUntil(async () => {
        const all = await getAllLeadershipStatus(instances, { silent: true });
        return all.every(s => s.status && ['LEADER', 'FOLLOWER'].includes(s.status));
    });
};

const waitForLeader = async (instances: Page[]) => {
    log.when('Waiting for election results');
    await waitUntil(async () => {
        const all = await getAllLeadershipStatus(instances, { silent: true });
        return all.some(s => s.status && ['LEADER'].includes(s.status));
    });
};

type LeaderStatus = Awaited<ReturnType<typeof getLeadershipStatus>>;