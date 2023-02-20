import React, { FC, useId } from 'react'
import { useLeader } from '@/api/useLeader'
import { isElectionResult } from '@tabrx/leader'

export const Leadership: FC = () => {
    const leader = useLeader()
    const iamId = useId()
    const statusId = useId()
    const leaderId = useId()

    if (!leader) return null

    return (
        <section aria-label="Leadership Status">
            <div>
                <label htmlFor={iamId}>IAM: </label>
                <span id={iamId}>{leader.iam}</span>
            </div>
            <div>
                <label htmlFor={statusId}>Status: </label>
                <span id={statusId}>{leader.status}</span>
            </div>
            <div>
                <label htmlFor={leaderId}>Leader: </label>
                <span id={leaderId}>{isElectionResult(leader) ? leader.leaderId : '-'}</span>
            </div>
        </section>
    )
}

