import { config } from './config';
import { devServiceProxy } from '@fakehost/utils-app-server';

export const init = async () => {
    // Because we are testing broadcasting between tabs, we need to ensure each set of tests
    // runs on its own port and hence "origin" so the tests are isolated.
    const baseUrl = config.use?.baseURL!;
    const proxy = await startProxy(baseUrl);
    return proxy;
};

const startProxy = async (url: string) => {
    const port = parseInt(url.split(':')[2]);
    return devServiceProxy(port);
};
