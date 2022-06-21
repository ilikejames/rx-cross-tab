import React from 'react';
import ReactDom from 'react-dom/client';
import { create } from 'rx-tab-duplex';
import { App } from './App';

create();

ReactDom.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
