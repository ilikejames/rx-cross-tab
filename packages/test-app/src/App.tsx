import { FC } from 'react';
import { IncrementingButton } from './IncrementingButton';
import { Leadership } from '@/components/Leadership'

export const App: FC = () => {
    return (
        <div>
            <h1>Multi Tab Test cases</h1>
            <Leadership />
            <p>
                <i>Open multiple tabs</i>
            </p>
            <IncrementingButton />
        </div>
    );
};
