import { BehaviorSubject, filter, share } from 'rxjs'
import { LoggerOptions, loggerName } from '../logger'
import { ChannelNetwork } from '../network'
import { ElectionTopics, Vote, VoteForMe } from './messageTypes'
import { ElectionResults, VoteBy, VoteFor } from './types'
import { voteCounter } from './voteCounter'

export type ElectionOptions = {
    electionTimeoutMin: number
    electionTimeoutRange: number
    electionChannelName: string
    ___delaySelfVoteForTesting?: number
}

export const defaultElectionOptions: ElectionOptions = {
    electionTimeoutMin: 250,
    electionTimeoutRange: 100,
    electionChannelName: '@tabrx/election',
}

const TERM = 0

export const ElectionSvcEventTypes = {
    Initialized: 'Initialized',
    Started: 'Started',
    Complete: 'Complete',
} as const

type Initialized = {
    type: typeof ElectionSvcEventTypes.Initialized
}

type ElectionStarted = {
    type: typeof ElectionSvcEventTypes.Started
}

type ElectionComplete = {
    type: typeof ElectionSvcEventTypes.Complete
    payload: ElectionResults
}

export type ElectionEvents = Initialized | ElectionStarted | ElectionComplete

export class ElectionSvc {
    private channel: ChannelNetwork<keyof typeof ElectionTopics>
    private options: ElectionOptions
    private electionCompleteMs: number
    private hasVoted = false
    private selectVoteTimerId: ReturnType<typeof globalThis.setTimeout> | null = null
    private electionTimerId: ReturnType<typeof globalThis.setTimeout> | null = null
    private votes = new Map<VoteBy, VoteFor>()

    private events = new BehaviorSubject<ElectionEvents>({
        type: ElectionSvcEventTypes.Initialized,
    })
    public readonly events$ = this.events.pipe(share())

    constructor(private readonly instanceId: string, options?: Partial<ElectionOptions>, private logger?: LoggerOptions) {
        this.options = { ...defaultElectionOptions, ...options }
        this.electionCompleteMs = this.options.electionTimeoutMin + this.options.electionTimeoutRange
        this.channel = new ChannelNetwork(this.options.electionChannelName, this.instanceId, this.logger)
        this.events$.subscribe()

        this.channel
            .subscribeToTopic(ElectionTopics.VoteForMe)
            .pipe(filter((m): m is VoteForMe => m.topic === ElectionTopics.VoteForMe))
            .subscribe(this.handleVoteRequested.bind(this))

        this.channel
            .subscribeToTopic(ElectionTopics.Vote)
            .pipe(filter((m): m is Vote => m.topic === ElectionTopics.Vote))
            .subscribe(this.handleVoteReceived.bind(this))
    }

    private handleVoteReceived(vote: Vote) {
        this.voteReceived(vote.from as VoteBy, vote.payload.voteFor)
    }

    private voteReceived(from: VoteBy, voteFor: VoteFor) {
        this.votes.set(from, voteFor)
    }

    private handleVoteRequested(message: VoteForMe) {
        this.logger?.debug(loggerName, 'Vote requested', message)

        if (!this.electionTimerId) {
            // clear count
            this.votes.clear()
            this.events.next({ type: ElectionSvcEventTypes.Started })
            const remainingOfElection = message.payload.endOfElectionTime - Date.now()
            this.logger?.debug(loggerName, `New election requested, completing in ${remainingOfElection}ms`)
            this.hasVoted = false
            this.electionTimerId = setTimeout(this.countVotes.bind(this), remainingOfElection)
        }

        // add the request to total vote
        this.voteReceived(message.from as VoteBy, message.payload.voteFor)

        // clear self vote timer
        if (this.selectVoteTimerId) {
            clearTimeout(this.selectVoteTimerId)
            this.selectVoteTimerId = null
        }

        if (!this.hasVoted) {
            this.hasVoted = true
            const payload: Vote['payload'] = {
                voteFor: message.payload.voteFor,
                term: TERM,
            }
            this.logger?.debug(loggerName, 'Voting for other', payload)
            this.channel.sendToTopic(ElectionTopics.Vote, payload)

            this.voteReceived(this.instanceId as VoteBy, message.payload.voteFor)
        }
    }

    public start() {
        if (this.electionTimerId) {
            this.logger?.debug(loggerName, 'Election already in progress')
            return
        }

        const delayMs =
            this.options.electionTimeoutMin +
            Math.random() * this.options.electionTimeoutRange +
            (this.options.___delaySelfVoteForTesting || 0)

        this.logger?.info(loggerName, 'Starting election...')
        this.events.next({ type: ElectionSvcEventTypes.Started })
        this.logger?.debug(loggerName, `Delaying vote ${delayMs}ms`, Date.now() + delayMs)

        const endOfElectionTime = Date.now() + this.electionCompleteMs
        this.logger?.debug(loggerName, `Election ends at ${endOfElectionTime}`, this.electionCompleteMs)

        this.selectVoteTimerId = setTimeout(() => {
            if (this.hasVoted) {
                this.logger?.debug(loggerName, 'Already voted. Will not self vote')
            } else {
                const payload: VoteForMe['payload'] = {
                    voteFor: this.instanceId as VoteBy,
                    term: TERM,
                    endOfElectionTime,
                }

                this.logger?.debug(loggerName, 'Self voting', payload)
                this.channel.sendToTopic(ElectionTopics.VoteForMe, payload)
                this.voteReceived(this.instanceId as VoteBy, this.instanceId as VoteFor)
                this.hasVoted = true
            }
        }, delayMs)
        this.electionTimerId = setTimeout(this.countVotes.bind(this), this.electionCompleteMs)
    }

    private countVotes() {
        const result = voteCounter(this.instanceId, this.votes)
        this.electionTimerId = null
        this.hasVoted = false
        this.votes.clear()
        this.logger?.debug(loggerName, 'Election results', result)
        // Do we need to ensure all agree on the outcome?
        this.events.next({ type: ElectionSvcEventTypes.Complete, payload: result })
    }
}
