import { bind, shareLatest } from '@react-rxjs/core'
import { LeadershipOptions, LeadershipSvc } from '@tabrx/leader'
import { map, scan, throttleTime } from 'rxjs'
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

export const leadershipSvc = new LeadershipSvc(options)

leadershipSvc.start()

export const [useLeader, leader$] = bind(leadershipSvc.leader$, undefined)

export const [useHeartbeatEvents, heartbeatEvents$] = bind(() => {
    return leadershipSvc.heartbeatEvents$.pipe(
        scan((acc, event) => {
            acc.push(event)
            return acc
        }, [] as any[]),
        throttleTime(200, undefined, { leading: false, trailing: true }),
        map(events => [...events].reverse()),
        shareLatest(),
    )
}, [])
