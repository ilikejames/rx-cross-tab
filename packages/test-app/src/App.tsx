import { FC } from 'react';
import { IncrementingButton } from './IncrementingButton';

export const App: FC = () => {
    return (
        <div>
            <h1>Multi Tab Test cases</h1>
            <p>
                <i>Open multiple tabs</i>
            </p>
            <IncrementingButton />
        </div>
    );
};
