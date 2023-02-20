import { Message } from '../network/types';
import { LeaderStatus } from '../types';

export const LeadershipTopicTypes = {
    WhoIsLeader: 'WhoIsLeader',
    WhoIsLeaderResponse: 'WhoIsLeaderResponse',
    Leaving: 'Leaving',
} as const;

export type LeadershipTopics = keyof typeof LeadershipTopicTypes;

export interface WhoIsLeaderResponse
    extends Message<typeof LeadershipTopicTypes.WhoIsLeaderResponse> {
    payload: LeaderStatus;
}

export interface WhoIsLeader extends Message<typeof LeadershipTopicTypes.WhoIsLeader> {
    payload: undefined;
}

export interface LeavingMessage extends Message<typeof LeadershipTopicTypes.WhoIsLeader> {
    payload: undefined;
}
