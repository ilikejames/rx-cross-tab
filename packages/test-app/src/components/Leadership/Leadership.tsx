import { isElectionResult } from '@tabrx/leader'
import React, { FC, useId } from 'react'
import { useHeartbeatEvents, useLeader } from '@/api/useLeader'

export const Leadership: FC = () => {
    const leader = useLeader()
    const heartbeat = useHeartbeatEvents()
    const iamId = useId()
    const statusId = useId()
    const leaderId = useId()

    if (!leader) return null

    return (
        <section aria-label="Leadership Status">
            <div>
                <label htmlFor={iamId}>IAM: </label>
                <input id={iamId} name="iam" value={leader.iam} disabled={true} />
            </div>
            <div>
                <label htmlFor={statusId}>Status: </label>
                <input id={statusId} name="status" value={leader.status} disabled={true} />
            </div>
            <div>
                <label htmlFor={leaderId}>Leader: </label>
                <input id={leaderId} name="leader" value={isElectionResult(leader) ? leader.leaderId : '-'} disabled={true} />
            </div>
            <div>
                <ul>
                    {heartbeat.map((h, i) => (
                        <li key={i}>{JSON.stringify(h)}</li>
                    ))}
                </ul>
            </div>
        </section>
    )
}
