import { Message } from '../network/types';
import { VoteFor } from './types';

export const ElectionTopics = {
    VoteForMe: 'VoteForMe',
    Vote: 'Vote',
} as const;

export interface VoteForMe extends Message<typeof ElectionTopics.VoteForMe> {
    payload: {
        voteFor: VoteFor;
        endOfElectionTime: number;
        term: number;
    };
}

export interface Vote extends Message<typeof ElectionTopics.Vote> {
    payload: {
        voteFor: VoteFor;
        term: number;
    };
}
