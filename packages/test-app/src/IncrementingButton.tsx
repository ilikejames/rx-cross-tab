import { bind, shareLatest } from '@react-rxjs/core'
import React, { FC } from 'react'
import { broadcast, duplex } from 'rx-tab-duplex'
import { BehaviorSubject } from 'rxjs'
import { tap } from 'rxjs/operators'

export const IncrementingButton: FC = () => {
    const counter = useCounter()
    const onClick = () => subjectBroadcast(counter + 1)

    return (
        <div>
            <button id="incrementing-button" onClick={onClick}>
                Click Increments Across All Tabs: {counter}
            </button>
        </div>
    )
}

const subject = new BehaviorSubject<number>(0)

const subjectBroadcast = broadcast<number, BehaviorSubject<number>>('IncrementingCounter', subject)

const mystream$ = subject.pipe(
    tap(v => console.log('!!!', v)),
    shareLatest(),
)

const [useCounter] = bind(() => {
    const stream$ = duplex('IncrementingCounter', mystream$)
    return stream$
}, 0)
