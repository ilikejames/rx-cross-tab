export const LeadershipStatus = {
    LEADER: 'LEADER',
    FOLLOWER: 'FOLLOWER',
    ELECTING: 'ELECTING',
    INITIALIZING: 'INITIALIZING',
} as const;

type LeaderType = keyof typeof LeadershipStatus;

type BaseLeaderStatus = {
    iam: string;
    status: LeaderType;
};

export interface ElectionResult extends BaseLeaderStatus {
    leaderId: string;
    isLeader: boolean;
    status: typeof LeadershipStatus.LEADER | typeof LeadershipStatus.FOLLOWER;
}

export type LeaderStatus = BaseLeaderStatus | ElectionResult;

export const isElectionResult = (s: LeaderStatus): s is ElectionResult => {
    return s.status === LeadershipStatus.LEADER || s.status === LeadershipStatus.FOLLOWER;
};
