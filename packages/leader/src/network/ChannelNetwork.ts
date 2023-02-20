import { Observable, filter, fromEvent, map, share, tap, take } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { loggerName as rootLoggerName } from '../logger';
import { Message } from './types';

type Logger = {
    debug: (message: string, ...args: any[]) => void;
};

const loggerName = rootLoggerName + '/network';
export class ChannelNetwork<T extends string> {
    private channel: BroadcastChannel;
    private message$: Observable<Message<T>>;

    constructor(
        private channelName: string,
        public readonly instanceId: string,
        private logger?: Logger,
    ) {
        this.logger?.debug('New ChannelNetwork', this.channelName);

        this.channel = new BroadcastChannel(this.channelName);
        this.message$ = fromEvent(this.channel, 'message').pipe(
            filter(isMessageEvent),
            map(m => m.data),
            filter((message): message is Message<T> => isMessage(message)),
            share(),
        );

        this.message$.subscribe(m => {
            this.logger?.debug(loggerName, 'received', m);
        });
    }

    public requestResponse = ({ topic, payload }: Pick<Message<T>, 'topic' | 'payload'>) => {
        return this.requestStream({ topic, payload }).pipe(take(1));
    };

    public requestStream({ topic, payload }: Pick<Message<T>, 'topic' | 'payload'>) {
        const request: Message<T> = {
            from: this.instanceId,
            topic,
            payload,
            correlationId: uuid(),
        };
        this.send(request, 'requestStream');
        return this.message$.pipe(
            filter(message => message.correlationId === request.correlationId),
            tap(r => {
                this.logger?.debug(loggerName, 'requestStream', 'next', Date.now(), r);
            }),
        );
    }

    public subscribeToTopic(topic: T): Observable<Message<T>> {
        // perhaps this should parse the payload?
        return this.message$.pipe(filter(message => message.topic === topic));
    }

    public sendToTopic(topic: T, payload: unknown) {
        const message: Message<T> = {
            from: this.instanceId,
            topic,
            payload,
            correlationId: uuid(),
        };
        this.send(message, 'sendToTopic');
    }

    public send(
        message: Pick<Message<T>, 'topic' | 'payload'> & Partial<Message<T>>,
        type?: string,
    ) {
        const request: Message<T> = {
            from: this.instanceId,
            ...message,
            correlationId: message.correlationId ?? uuid(),
        };
        this.logger?.debug(loggerName, type ?? 'send', Date.now(), request);
        this.channel.postMessage(request);
    }

    public dispose() {
        this.channel.close();
    }
}

const isMessage = <T extends string>(message: any): message is Message<T> => {
    return (
        message.hasOwnProperty('correlationId') &&
        message.hasOwnProperty('from') &&
        message.hasOwnProperty('topic') &&
        message.hasOwnProperty('payload')
    );
};

const isMessageEvent = (message: any): message is MessageEvent => 'data' in message;
