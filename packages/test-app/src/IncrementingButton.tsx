import { FC } from 'react';
import { BehaviorSubject } from 'rxjs';
import { bind, shareLatest } from '@react-rxjs/core';
import { duplex } from 'rx-tab-duplex';

export const IncrementingButton: FC = () => {
    const onClick = () => subject.next(subject.value + 1);
    const counter = useCounter();

    return (
        <div>
            <button onClick={onClick}>Clicks: {counter}</button>
        </div>
    );
};

const subject = new BehaviorSubject<number>(0);

const [useCounter] = bind(() => {
    return duplex('IncrementingCounter', subject.pipe(shareLatest()));
}, 0);
