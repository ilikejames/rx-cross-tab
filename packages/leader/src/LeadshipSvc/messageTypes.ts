import { Message } from '../network/types';
import { LeaderStatus } from '../types';

export const LeadershipTopicTypes = {
    WhoIsLeader: 'WhoIsLeader',
    WhoIsLeaderResponse: 'WhoIsLeaderResponse',
    Leaving: 'Leaving',
    Heartbeat: 'Heartbeat',
    HeartbeatResponse: 'HeartbeatResponse',
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

export type Timestamp = number & { __timestamp: never };

export interface Heartbeat extends Message<typeof LeadershipTopicTypes.Heartbeat> {
    payload: Timestamp;
}

export interface HeartbeatResponse extends Message<typeof LeadershipTopicTypes.HeartbeatResponse> {
    payload: Timestamp;
}
