import { describe, test, expect } from 'vitest';
import { voteCounter } from './voteCounter';
import { ElectionResults, VoteBy, VoteFor } from './types';

describe('voteCounter', () => {
    test('winner', () => {
        const votes = new Map<VoteBy, VoteFor>([
            ['a', 'a'],
            ['b', 'a'],
            ['c', 'b'],
        ] as [VoteBy, VoteFor][]);
        const result = voteCounter('a', votes);

        const expectedResult: ElectionResults = {
            type: 'Won',
            winner: 'a',
            winnerVotes: 2,
            howTheyVoted: new Map([
                ['a', ['a', 'b']],
                ['b', ['c']],
            ] as [VoteFor, VoteBy[]][]),
            totalVotes: votes.size,
            allVoters: ['a', 'b', 'c'],
        };
        expect(result).toEqual(expectedResult);
    });

    test('loser', () => {
        const votes = new Map([
            ['a', 'a'],
            ['b', 'a'],
            ['c', 'b'],
        ] as [VoteBy, VoteFor][]);
        const result = voteCounter('b', votes);

        const expectedResult: ElectionResults = {
            type: 'Lost',
            winner: 'a',
            winnerVotes: 2,
            totalVotes: votes.size,
            howTheyVoted: new Map([
                ['a', ['a', 'b']],
                ['b', ['c']],
            ] as [VoteFor, VoteBy[]][]),
            allVoters: ['a', 'b', 'c'],
        };
        expect(result).toEqual(expectedResult);
    });

    test('tied', () => {
        const votes = new Map([
            ['a', 'a'],
            ['b', 'b'],
            ['c', 'a'],
            ['d', 'b'],
            ['e', 'c'],
        ] as [VoteBy, VoteFor][]);
        const result = voteCounter('a', votes);
        const expectedResult: ElectionResults = {
            type: 'Tied',
            winnerVotes: 2,
            totalVotes: votes.size,
            howTheyVoted: new Map([
                ['a', ['a', 'c']],
                ['b', ['b', 'd']],
                ['c', ['e']],
            ] as [VoteFor, VoteBy[]][]),
            allVoters: ['a', 'b', 'c', 'd', 'e'],
        };
        expect(result).toEqual(expectedResult);
    });
});
