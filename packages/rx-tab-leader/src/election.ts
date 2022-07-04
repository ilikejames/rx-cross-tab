import { Vote, VoteForMe } from './types';
import { subscribeToTopic, sendToTopic } from './network';
import { rootLogger } from './logger';
import { internalId } from './internalId';
import { leader, term } from './leader';

const logger = rootLogger.createLogger('election');

const ELECTION_TIMEOUT_MIN = 250;
const ELECTION_TIMEOUT_RANGE = 100;
const ELECTION_TIMEOUT_MAX = ELECTION_TIMEOUT_MIN + ELECTION_TIMEOUT_RANGE;

let electionTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
let hasVoted = false;

export const startElection = () => {
    logger.info('Starting election...');
    if (electionTimer) {
        logger.info('Election already running');
        return;
    }

    term.next(term.value + 1);

    const delayMs = ELECTION_TIMEOUT_MIN + Math.random() * ELECTION_TIMEOUT_RANGE;
    logger.debug(`Delaying self vote for ${delayMs}`);
    setTimeout(() => {
        if (hasVoted) {
            logger.debug('Already voted. Will not self vote');
        } else {
            const payload: VoteForMe['payload'] = {
                id: internalId,
                term: term.value,
            };

            logger.debug('Self voting', payload);
            sendToTopic('vote_for_me', payload);
            vote(payload.term, payload.id);
            hasVoted = true;
        }
    }, delayMs);

    electionTimer = setTimeout(countVotes, ELECTION_TIMEOUT_MAX);
};

const countVotes = () => {
    logger.debug('Counting votes...', votes);
    electionTimer = null;
    hasVoted = false;
    let highest = 0;
    let highestKey;
    let isTied = false;
    let totalVotes = 0;
    for (const [key, count] of votes.entries()) {
        totalVotes += count;
        if (count > highest) {
            highest = count;
            highestKey = key;
            isTied = false;
        } else if (count === highest) {
            isTied = true;
        }
    }
    if (isTied) {
        // TODO: rerun election
        logger.warn('Tied election.', votes);
        startElection();
        return;
    }
    if (highestKey === internalId) {
        leader.next(true);
        logger.info(`I am the leader with ${highest} of ${totalVotes}`);
    } else {
        leader.next(false);
        logger.info(`${highestKey} is the leader with ${highest} of ${totalVotes}`);
        logger.info('I am the follower');
    }
};

subscribeToTopic<VoteForMe>('vote_for_me').subscribe(voteForMeRequest => {
    logger.debug('incoming: vote_for_me', voteForMeRequest);
    // if (!isNextTerm(voteForMeRequest.payload.term)) {
    //     return;
    // }
    if (!electionTimer) {
        hasVoted = false;
        electionTimer = setTimeout(countVotes, ELECTION_TIMEOUT_MAX);
    }
    if (!hasVoted) {
        hasVoted = true;
        // Vote for this first requester

        const payload: Vote['payload'] = {
            id: voteForMeRequest.from,
            term: voteForMeRequest.payload.term,
        };

        logger.info('Voting for the other guy', payload);
        sendToTopic('vote', payload);
        vote(voteForMeRequest.payload.term, payload.id);
    }
});

const votes = new Map<string, number>();
let votingTerm: number | undefined;

subscribeToTopic<Vote>('vote').subscribe(castedVote => {
    logger.debug('incoming: vote', castedVote);
    // if (!isNextTerm(castedVote.payload.term)) {
    //     return;
    // }
    vote(castedVote.payload.term, castedVote.payload.id);
});

const vote = (term: number, id: string) => {
    // if (votingTerm !== term) {
    //     votes.clear();
    // }
    const count = votes.get(id) || 0;
    logger.debug('count =', count);
    votes.set(id, count + 1);
};

const isNextTerm = (requestedTerm: number) => {
    // check correct term
    if (term && requestedTerm !== term.value + 1) {
        logger.info(`Invalid term "${requestedTerm}". Expected ${term.value + 1}`);
        return false;
    }
    return true;
};
