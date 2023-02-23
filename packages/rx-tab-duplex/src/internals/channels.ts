import { BroadcastChannel } from 'broadcast-channel'

const channelMap = new Map<string, BroadcastChannel<any>>()

export const getChannel = <T>(name: string) => {
    if (!channelMap.has(name)) {
        channelMap.set(name, new BroadcastChannel<T>(name, {}))
    }
    return channelMap.get(name) as BroadcastChannel<T>
}
