import { bind } from '@react-rxjs/core'
import { LeadershipSvc } from '@tabrx/leader'

export const leadershipSvc = new LeadershipSvc({
    logger: {
        debug: console.debug,
        info: console.info,
    },
    heartbeatInterval: 1000,
    heartbeatTimeout: 900,
})
leadershipSvc.start()

export const [useLeader, leader$] = bind(leadershipSvc.leader$, undefined)
