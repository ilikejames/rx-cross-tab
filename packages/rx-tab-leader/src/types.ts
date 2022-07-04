export type TopicType =
    | 'who_is_leader'
    | 'who_is_leader_response'
    | 'vote_for_me'
    | 'vote'
    | 'heartbeat';

export interface Message<T extends TopicType> {
    correlationId: string;
    from: string;
    topic: T;
    payload: unknown;
}

export interface WhoIsLeader extends Message<'who_is_leader'> {
    payload: undefined;
}

export interface WhoIsLeaderResponse extends Message<'who_is_leader_response'> {
    payload: {
        term: number;
        id: string;
    };
}

export interface Vote extends Message<'vote'> {
    payload: {
        id: string;
        term: number;
    };
}

export interface VoteForMe extends Message<'vote_for_me'> {
    payload: {
        id: string;
        term: number;
    };
}

export type ObjectType<T extends TopicType> = T extends 'who_is_leader'
    ? WhoIsLeader
    : T extends 'who_is_leader_response'
    ? WhoIsLeaderResponse
    : T extends 'vote'
    ? Vote
    : T extends 'vote_for_me'
    ? VoteForMe
    : never;

export type Messages = WhoIsLeader | WhoIsLeaderResponse | Vote | VoteForMe;
