import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ElectionSvc } from './ElectionSvc'
import { ElectionResultTypes, ElectionResults } from './types'

describe('Election', () => {
    const addEventListener = vi.fn()
    const postMessage = vi.fn()
    const BroadcastChannelMock = vi.fn(() => ({
        addEventListener,
        removeEventListener: vi.fn(),
        postMessage: postMessage,
    }))

    beforeEach(() => {
        vi.stubGlobal('BroadcastChannel', BroadcastChannelMock)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    type MessageHandler = (message: MessageEvent) => void

    test('can this be tested', async () => {
        const listeners: MessageHandler[] = []
        addEventListener.mockImplementation((event: 'message', cb: MessageHandler) => {
            listeners.push(cb)
        })

        const promise = new Promise(resolve => {
            const election = new ElectionSvc(result => resolve(result), 'instance1', {
                electionChannelName: 'test1',
            })
            election.start()
        })
        const result = await promise
        expect(postMessage).toHaveBeenCalledOnce()
        expect(postMessage).toHaveBeenLastCalledWith(
            expect.objectContaining({
                topic: 'VoteForMe',
            }),
        )

        expect(result).toBeTruthy()
    })

    test('one fast one slow, the fast one becomes the leader', async () => {
        const listeners: MessageHandler[] = []
        addEventListener.mockImplementation((event: 'message', cb: MessageHandler) => {
            listeners.push(cb)
        })
        postMessage.mockImplementation((message: any) => {
            listeners.forEach(listener => listener({ data: message } as MessageEvent))
        })

        const promise1 = new Promise<ElectionResults>(resolve => {
            const election = new ElectionSvc(result => resolve(result), 'instance1', {
                electionChannelName: 'test2',
                electionTimeoutRange: 100,
                ___delaySelfVoteForTesting: -50,
            })
            election.start()
        })
        const promise2 = new Promise<ElectionResults>(resolve => {
            const election = new ElectionSvc(result => resolve(result), 'instance2', {
                electionChannelName: 'test2',
                electionTimeoutRange: 100,
                ___delaySelfVoteForTesting: 50,
            })
            election.start()
        })

        const [resultA, resultB] = await Promise.all([promise1, promise2])

        expect(resultA).toMatchObject({
            type: ElectionResultTypes.Won,
            winnerVotes: 2,
            totalVotes: 2,
        } as ElectionResults)

        expect(resultB).toMatchObject({
            type: ElectionResultTypes.Lost,
            winnerVotes: 2,
            totalVotes: 2,
        } as ElectionResults)
    })
})
