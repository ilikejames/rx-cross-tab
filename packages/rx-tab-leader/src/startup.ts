import { firstValueFrom } from 'rxjs';
import { requestResponse, sendToCorrelation, subscribeToTopic } from './network';
import { timeout } from './timeout';
import { WhoIsLeader, WhoIsLeaderResponse } from './types';
import { rootLogger } from './logger';
import { startElection } from './election';
import { leader, term } from './leader';
import { internalId } from './internalId';

const logger = rootLogger.createLogger('startup');

export const startup = async () => {
    try {
        const result = await Promise.race([
            firstValueFrom(requestResponse({ topic: 'who_is_leader', payload: undefined })),
            startupTimeout(),
        ]);
        logger.info('leader is', result);
        logger.info('I am a follower');
    } catch (ex) {
        logger.warn(ex);
        startElection();
    }
};

const START_UP_TIMEOUT = 50;

const startupTimeout = () => {
    return timeout(10 + Math.random() * START_UP_TIMEOUT);
};

subscribeToTopic<WhoIsLeader>('who_is_leader').subscribe(whoIsLeader => {
    logger.debug(whoIsLeader);
    if (!leader.value) {
        logger.info('Ignoring. Not the leader');
        return;
    }
    const payload: WhoIsLeaderResponse['payload'] = {
        id: internalId,
        term: term.value,
    };
    logger.debug('responding', '"i am!"', payload);
    sendToCorrelation(whoIsLeader.correlationId, whoIsLeader.topic, payload);
});
