import { ElectionResultTypes, ElectionResults, VoteBy, VoteFor } from './types'

export const voteCounter = (meId: string, votes: Map<VoteBy, VoteFor>): ElectionResults => {
    const allVoters = Array.from(votes.keys())

    const howTheyVoted = Array.from(votes.entries()).reduce((acc, [voteBy, voteFor]) => {
        const votes = acc.get(voteFor) || []
        acc.set(voteFor, [...votes, voteBy])
        return acc
    }, new Map<VoteFor, VoteBy[]>())

    const counts = Array.from(votes.values()).reduce((acc, curr) => {
        const count = acc.get(curr) || 0
        acc.set(curr, count + 1)
        return acc
    }, new Map<string, number>())
    const highest = Math.max(...counts.values())
    const winners = new Set(
        Array.from(counts.entries())
            .filter(([_, count]) => count === highest)
            .map(([id]) => id),
    )

    if (winners.size > 1) {
        return {
            type: ElectionResultTypes.Tied,
            totalVotes: allVoters.length,
            winnerVotes: highest,
            howTheyVoted: howTheyVoted,
            allVoters: allVoters,
        }
    }

    return {
        type: winners.has(meId) ? ElectionResultTypes.Won : ElectionResultTypes.Lost,
        winnerVotes: highest,
        totalVotes: allVoters.length,
        winner: Array.from(winners)[0],
        howTheyVoted,
        allVoters: allVoters,
    }
}
