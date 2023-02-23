export const ElectionResultTypes = {
    Tied: 'Tied',
    Won: 'Won',
    Lost: 'Lost',
} as const

export type VoteFor = string & { __voteFor: 'VoteFor' }
export type VoteBy = string & { __voteFor: 'VoteFor' }

export type ElectionResults = {
    type: keyof typeof ElectionResultTypes
    winner?: string
    winnerVotes: number
    totalVotes: number
    howTheyVoted: Map<VoteFor, VoteBy[]>
    allVoters: string[]
}
