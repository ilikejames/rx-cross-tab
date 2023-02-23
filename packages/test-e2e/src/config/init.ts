import { devServiceProxy, staticServer } from '@fakehost/utils-app-server'
import { config } from './config'

export const init = async () => {
    // Because we are testing broadcasting between tabs, we need to ensure each set of tests
    // runs on its own port and hence "origin" so the tests are isolated.

    let appHost: Awaited<ReturnType<typeof devServiceProxy>>

    if (process.env.BUILT_APP_PATH) {
        appHost = await startStaticService(process.env.BUILT_APP_PATH)
    } else {
        const baseUrl = config.use!.baseURL!
        appHost = await startProxy(baseUrl)
    }

    return {
        url: appHost.url,
        dispose: async () => {
            // fire & forget... express can take a while to close
            appHost.dispose()
        },
    }
}

const startProxy = async (url: string) => {
    const port = parseInt(url.split(':')[2])
    return devServiceProxy(port)
}

const startStaticService = (relativePath: string) => {
    return staticServer(relativePath, 0)
}
