import { BrowserContext, Page, expect, test } from '@playwright/test'
import { init } from './config'
import { WaitOptions, log, waitUntil } from './helper'

test.describe.parallel('leadership', () => {
    let env: Awaited<ReturnType<typeof init>>

    test.beforeEach(async () => {
        env = await init()
    })

    test.afterEach(async ({ context }) => {
        return env.dispose()
    })

    test('instances go through the startup process', async ({ context }) => {
        const tabNames = ['a', 'b', 'c']
        log.when('Opening tabs', tabNames)
        const instances = await createMultipleInstances(env.url, context, tabNames, {
            electionTimeoutMin: 2_000,
            startupTimeout: 2_000,
        })

        const waitOptions: WaitOptions = { interval: 500, timeout: 5_000 }

        log.then('Starts "INITIALIZING"')
        await waitUntil(async () => {
            const status = await getAllLeadershipStatus(instances, { silent: true })
            return status.every(v => v.status === 'INITIALIZING')
        }, waitOptions)
        const initial = await getAllLeadershipStatus(instances)
        initial.forEach(({ leader }) => expect(leader).toBe('-'))

        log.then('Then "ELECTING"')
        await waitUntil(async () => {
            const status = await getAllLeadershipStatus(instances, { silent: true })
            return status.every(v => v.status === 'ELECTING')
        }, waitOptions)
        const electing = await getAllLeadershipStatus(instances)
        electing.forEach(({ leader }) => expect(leader).toBe('-'))

        log.then('A leader is elected')
        await waitUntil(async () => {
            const status = await getAllLeadershipStatus(instances, { silent: true })
            return status.every(v => v.status !== 'ELECTING' && v.status !== 'INITIALIZING')
        }, waitOptions)
        const consensus = await getAllLeadershipStatus(instances)
        consensus.forEach(({ leader }) => expect(leader).toMatch(/^[a|b|c]$/))
    })

    test('with multiple opening an election is held to find the leader', async ({ context }) => {
        const tabNames = ['a', 'b', 'c']
        log.when('Opening tabs', tabNames)
        const instances = await createMultipleInstances(env.url, context, tabNames)

        await waitForElectionResults(instances)
        const results = await getAllLeadershipStatus(instances)

        expect(results.filter(r => r.status === 'LEADER')).toHaveLength(1)
        const leaderTab = results.find(r => r.status === 'LEADER')!
        expect(leaderTab.leader).toEqual(leaderTab.iam)
        const followerTabs = results.filter(r => r.status === 'FOLLOWER')
        expect(followerTabs).toHaveLength(2)
        followerTabs.every(f => expect(f.leader).toEqual(leaderTab.iam))
    })

    test('with multiple open and new tabs join', async ({ context }) => {
        test.slow()
        const tabNames = ['a', 'b', 'c']
        log.when('Opening tabs', tabNames)
        const instances = await createMultipleInstances(env.url, context, tabNames)
        await waitForElectionResults(instances)

        const originalStatus = await getAllLeadershipStatus(instances)
        const originalLeader = originalStatus.find(r => r.status === 'LEADER')!

        const newTabs = ['new-d', 'new-e']
        log.when('Opening more tabs', newTabs)
        const newInstances = await createMultipleInstances(env.url, context, newTabs)
        await waitForElectionResults(newInstances)
        log.then('Election succeeded...')
        const results = await getAllLeadershipStatus([...instances, ...newInstances])

        expect(results.filter(r => r.status === 'LEADER')).toHaveLength(1)
        expect(results.find(r => r.status === 'LEADER')?.iam).toEqual(originalLeader.iam)

        newTabs.forEach(name => {
            const instance = results.find(r => r.iam === name)!
            expect(instance).toBeDefined()
            expect(instance.status).toEqual('FOLLOWER')
            expect(instance.leader).toEqual(originalLeader.iam)
        })
    })

    test('when a leader leaves', async ({ context }) => {
        const tabNames = ['a', 'b', 'c', 'd', 'e']
        log.when(`Opening tabs "${tabNames}"`)
        const instances = await createMultipleInstances(env.url, context, tabNames)
        await waitForElectionResults(instances)
        const initial = await getAllLeadershipStatus(instances)

        const initialLeader = initial.find(r => r.status === 'LEADER')!
        const leaderIndex = initial.findIndex(r => r.status === 'LEADER')
        log.when(`Closing leader tab ${leaderIndex} "${initialLeader.iam}"`)

        await instances[leaderIndex].close({ runBeforeUnload: true })

        const afterInstances = instances.filter((_, i) => i !== leaderIndex)
        await waitForLeaderConsensus(afterInstances)
        const results = await getAllLeadershipStatus(afterInstances)

        expect(results.filter(r => r.status === 'LEADER')).toHaveLength(1)
        const newLeaderTab = results.find(r => r.status === 'LEADER')!
        const followerTabs = results.filter(r => r.status === 'FOLLOWER')
        expect(followerTabs).toHaveLength(afterInstances.length - 1)
        followerTabs.every(f => expect(f.leader).toEqual(newLeaderTab.iam))

        log.then('Closing another tab...')
        const newLeaderIndex = results.findIndex(r => r.status === 'LEADER')
        log.when(`Closing the new leader tab ${newLeaderIndex} "${newLeaderTab.iam}"`)
        await afterInstances[newLeaderIndex].close({ runBeforeUnload: true })

        const finalInstances = afterInstances.filter((_, i) => i !== newLeaderIndex)
        await waitForLeaderConsensus(finalInstances)
        const finalResults = await getAllLeadershipStatus(finalInstances)

        expect(finalResults.filter(r => r.status === 'LEADER')).toHaveLength(1)
        const finalLeaderTab = finalResults.find(r => r.status === 'LEADER')!
        const finalFollowerTabs = finalResults.filter(r => r.status === 'FOLLOWER')
        expect(finalFollowerTabs).toHaveLength(finalInstances.length - 1)
        finalFollowerTabs.every(f => expect(f.leader).toEqual(finalLeaderTab.iam))
    })

    test('when a leader "dies"', async ({ context }) => {
        const tabNames = ['a', 'b', 'c', 'd', 'e']
        log.when(`Opening tabs "${tabNames}"`)

        const instances = await createMultipleInstances(env.url, context, tabNames)

        const logs = new Map<string, string[]>()
        instances.forEach((instance, i) => {
            logs.set(tabNames[i], [])
            instance.on('console', msg => {
                log.debug('console', tabNames[i], msg.text())
                logs.get(tabNames[i])!.push(msg.text())
            })
        })

        await waitForElectionResults(instances)
        const initial = await getAllLeadershipStatus(instances)

        const initialLeader = initial.find(r => r.status === 'LEADER')!
        const leaderIndex = initial.findIndex(r => r.status === 'LEADER')
        log.when(`The leader tab ${leaderIndex} "${initialLeader.iam}" dies....`)
        await instances[leaderIndex].close({ runBeforeUnload: false })

        await waitUntil(async () => {
            const isClosed = await instances[leaderIndex].isClosed()
            log.debug('isClosed', isClosed)
            return isClosed
        })

        const afterInstances = instances.filter((_, i) => i !== leaderIndex)

        try {
            await waitForLeaderConsensus(afterInstances, { timeout: 10_000 })

            const results = await getAllLeadershipStatus(afterInstances)

            expect(results.filter(r => r.status === 'LEADER')).toHaveLength(1)
            const newLeaderTab = results.find(r => r.status === 'LEADER')!
            const followerTabs = results.filter(r => r.status === 'FOLLOWER')
            expect(followerTabs).toHaveLength(afterInstances.length - 1)
            followerTabs.every(f => expect(f.leader).toEqual(newLeaderTab.iam))
        } catch (e) {
            log.debug('ERROR')
            logs.forEach((logs, name) => {
                log.debug(name, JSON.stringify(logs))
            })
        }
    })
})

const createInstance = async (url: string, context: BrowserContext, options: InstanceOptions & { name: string }) => {
    const page = await context.newPage()

    const testOptions: (keyof InstanceOptions)[] = ['channelName', 'electionTimeoutMin', 'startupTimeout']
    await page.addInitScript(([name]) => sessionStorage.setItem('tabId', name), [options.name])
    await Promise.all(
        testOptions.map(key => {
            if (options[key]) {
                return page.addInitScript(([key, value]) => sessionStorage.setItem(`test-${key}`, `${value}`), [key, options[key]])
            }
        }),
    )
    await page.goto(url)
    return page
}

type InstanceOptions = {
    channelName?: string
    electionTimeoutMin?: number
    startupTimeout?: number
}

const createMultipleInstances = async (url: string, context: BrowserContext, names: string[], options: InstanceOptions = {}) => {
    // Why create individually?
    // Running all and resolving in Promise.all causes some
    // to fail to be created (in firefox)
    const instances = new Array<Page>()
    for (const name of names) {
        const instance = await createInstance(url, context, { ...options, name })
        instances.push(instance)
    }
    return instances
}

const getLeadershipStatus = async (instance: Page) => {
    const status = await instance.getAttribute('input[name="status"]', 'value')
    const iam = await instance.getAttribute('input[name="iam"]', 'value')
    const leader = await instance.getAttribute('input[name="leader"]', 'value')
    return { iam, status, leader }
}

const getAllLeadershipStatus = async (instances: Page[], options = { silent: false }) => {
    const results: LeaderStatus[] = []
    for (const instance of instances) {
        const instanceStatus = await getLeadershipStatus(instance)
        if (!options.silent) {
            log.data(instanceStatus)
        }
        results.push(instanceStatus)
    }
    return results
}

const waitForElectionResults = async (instances: Page[]) => {
    log.when('Waiting for election results')
    await waitUntil(async () => {
        const all = await getAllLeadershipStatus(instances, { silent: true })
        return all.every(s => s.status && ['LEADER', 'FOLLOWER'].includes(s.status))
    })
}

const waitForLeaderConsensus = async (instances: Page[], options?: WaitOptions) => {
    log.when('Waiting for new leader consensus')
    let attempts = 0
    await waitUntil(
        async () => {
            log.debug('Attempt', ++attempts)
            const status = await getAllLeadershipStatus(instances, { silent: false })
            const leader = status.find(s => s.status && ['LEADER'].includes(s.status))
            return Boolean(leader && status.every(s => s.leader === leader.iam))
        },
        { interval: 500, ...options },
    )
}

type LeaderStatus = Awaited<ReturnType<typeof getLeadershipStatus>>
