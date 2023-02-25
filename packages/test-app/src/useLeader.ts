import { bind } from '@react-rxjs/core'
import { LeadershipSvc } from '@tabrx/leader'

export const leadershipSvc = new LeadershipSvc({
    logger: {
        debug: console.info,
        info: console.info,
    },
})
leadershipSvc.start()

export const [useLeader, leader$] = bind(leadershipSvc.leader$, undefined)
