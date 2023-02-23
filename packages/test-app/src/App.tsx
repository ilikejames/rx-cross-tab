import React, { FC } from 'react'
import { Leadership } from '@/components/Leadership'
import { IncrementingButton } from './IncrementingButton'

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
    )
}
