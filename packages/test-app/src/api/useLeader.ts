import { bind } from '@react-rxjs/core'
import { LeadershipOptions, LeadershipSvc } from '@tabrx/leader'
import { testValues } from './testValues'

const options: Partial<LeadershipOptions> = {
    channelName: testValues.getString('test-channelName', 'tabrx-leader'),
    electionChannelName: testValues.getString('test-channelName', 'tabrx-leader'),
    logger: {
        debug: console.debug,
        info: console.info,
    },
    heartbeatInterval: 1000,
    heartbeatTimeout: 900,
    startupTimeout: testValues.getInteger('test-startupTimeout'),
    electionTimeoutMin: testValues.getInteger('test-electionTimeoutMin'),
}

console.log('options.a', JSON.stringify(options))

export const leadershipSvc = new LeadershipSvc(options)
leadershipSvc.start()

export const [useLeader, leader$] = bind(leadershipSvc.leader$, undefined)
