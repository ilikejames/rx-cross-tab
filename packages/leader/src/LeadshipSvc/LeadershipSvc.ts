import {
    BehaviorSubject,
    combineLatest,
    concat,
    filter,
    firstValueFrom,
    fromEvent,
    map,
    Observable,
    of,
    race,
    shareReplay,
    skip,
    Subscription,
    switchMap,
    tap,
    timer,
    withLatestFrom,
} from 'rxjs';
import { v4 as uuid } from 'uuid';
import { ChannelNetwork } from '../network';
import {
    ElectionSvc,
    ElectionOptions,
    defaultElectionOptions,
    ElectionResults,
    ElectionResultTypes,
} from '../ElectionSvc';
import { loggerName, LoggerOptions } from '../logger';
import { isElectionResult, LeadershipStatus, LeaderStatus } from '../types';
import {
    LeadershipTopicTypes,
    LeadershipTopics,
    WhoIsLeader,
    WhoIsLeaderResponse,
    LeavingMessage,
    Heartbeat,
    HeartbeatResponse,
    Timestamp,
} from './messageTypes';

type LeadershipOptions = Omit<ElectionOptions, '___delaySelfVoteForTesting'> & {
    startupTimeout: number;
    channelName: string;
    logger?: LoggerOptions;
    heartbeatInterval: number;
    heartbeatTimeout: number;
};

const defaultSettings: LeadershipOptions = {
    startupTimeout: 50,
    channelName: 'tabrx-leader',
    heartbeatInterval: 3_000,
    heartbeatTimeout: 1_000,
    ...defaultElectionOptions,
};

export class LeadershipSvc {
    private options: LeadershipOptions;
    private channel: ChannelNetwork<LeadershipTopics>;
    private election: ElectionSvc;
    private leader: BehaviorSubject<LeaderStatus>;
    public readonly leader$: Observable<LeaderStatus>;
    private subscription: Subscription;

    constructor(options?: Partial<LeadershipOptions>) {
        this.leader = new BehaviorSubject<LeaderStatus>({
            status: LeadershipStatus.INITIALIZING,
            iam: this.iam,
        });
        this.leader$ = this.leader.pipe(shareReplay(1));
        this.subscription = this.leader$.subscribe();

        this.options = { ...defaultSettings, ...options };
        this.channel = new ChannelNetwork<LeadershipTopics>(
            this.options.channelName,
            this.iam,
            this.options.logger,
        );

        this.election = new ElectionSvc(
            this.onElectionComplete.bind(this),
            this.iam,
            this.options,
            this.options.logger,
        );

        // WhoIsLeader: only leader responds
        this.subscription.add(
            this.channel
                .subscribeToTopic(LeadershipTopicTypes.WhoIsLeader)
                .pipe(
                    filter((m): m is WhoIsLeader => m.topic === LeadershipTopicTypes.WhoIsLeader),
                    withLatestFrom(this.leader$),
                    filter(([_, leader]) => leader.status === LeadershipStatus.LEADER),
                    map(([message]) => message),
                )
                .subscribe(this.handleWhoIsLeader.bind(this)),
        );

        // Heartbeat: only leader responds
        this.subscription.add(
            this.channel
                .subscribeToTopic(LeadershipTopicTypes.Heartbeat)
                .pipe(
                    filter((m): m is Heartbeat => m.topic === LeadershipTopicTypes.Heartbeat),
                    withLatestFrom(this.leader$),
                    filter(([_, leader]) => leader.status === LeadershipStatus.LEADER),
                    map(([message]) => message),
                )
                .subscribe(this.handleHeartbeat.bind(this)),
        );

        // Leaving instance
        this.subscription.add(
            this.channel
                .subscribeToTopic(LeadershipTopicTypes.Leaving)
                .pipe(
                    filter((m): m is LeavingMessage => m.topic === LeadershipTopicTypes.Leaving),
                    withLatestFrom(this.leader$),
                    filter(([message, leader]) => {
                        if (isElectionResult(leader)) {
                            return leader.leaderId === message.from;
                        }
                        return false;
                    }),
                    map(([message]) => message),
                )
                .subscribe(() => {
                    this.options.logger?.info(loggerName, 'leader has left');
                    this.election.start();
                }),
        );

        // on window close
        this.subscription.add(
            fromEvent(globalThis, 'beforeunload').subscribe(() => {
                this.channel.sendToTopic(LeadershipTopicTypes.Leaving, undefined);
            }),
        );
    }

    public get iam() {
        if (!sessionStorage.getItem('tabId')) {
            sessionStorage.setItem('tabId', uuid());
        }
        return sessionStorage.getItem('tabId')!;
    }

    private handleHeartbeat(message: Heartbeat) {
        const response: HeartbeatResponse = {
            correlationId: message.correlationId,
            topic: LeadershipTopicTypes.HeartbeatResponse,
            from: this.iam,
            payload: Date.now() as Timestamp,
        };
        this.channel.send(response);
    }

    private handleWhoIsLeader(message: WhoIsLeader) {
        const response: WhoIsLeaderResponse = {
            correlationId: message.correlationId,
            topic: LeadershipTopicTypes.WhoIsLeaderResponse,
            from: this.iam,
            payload: {
                iam: this.iam,
                isLeader: false,
                leaderId: this.iam,
                status: LeadershipStatus.FOLLOWER,
            },
        };
        this.channel.send(response);
    }

    private async onElectionComplete(results: ElectionResults) {
        this.options.logger?.info(loggerName, 'election complete', results);

        if (results.type === ElectionResultTypes.Tied) {
            this.options.logger?.info(loggerName, 'Tied election. Retrying...');
            this.election.start();
            return;
        }

        this.leader.next({
            iam: this.iam,
            status:
                results.type === ElectionResultTypes.Won
                    ? LeadershipStatus.LEADER
                    : LeadershipStatus.FOLLOWER,
            isLeader: results.type === ElectionResultTypes.Won,
            leaderId: results.winner!,
        });

        this.options.logger?.info(
            loggerName,
            `I am ${results.type === ElectionResultTypes.Won ? 'the leader' : 'a follower'}`,
        );
    }

    public async start() {
        const startTime = Date.now();

        try {
            // TODO: can we check for something present e.g. local storage item.
            // no item... go straight to election
            this.options.logger?.info(loggerName, 'Starting...');
            const timeoutMs = 10 + Math.random() * this.options.startupTimeout;

            this.options.logger?.debug(
                loggerName,
                `Waiting for ${LeadershipTopicTypes.WhoIsLeaderResponse} within ${timeoutMs}ms`,
            );

            const result = await Promise.race([this.askForLeader(), timeout(timeoutMs)]);

            this.options.logger?.info(loggerName, 'leader is', result);
            this.options.logger?.info(loggerName, 'I am a follower');
            this.leader.next({ ...result.payload, iam: this.iam });
        } catch (ex) {
            this.options.logger?.debug(loggerName, `Timeout in ${Date.now() - startTime}ms`);
            this.leader.next({
                iam: this.iam,
                status: LeadershipStatus.ELECTING,
            });
            this.election.start();
        } finally {
            this.heartbeat();
        }
    }

    private heartbeat() {
        this.subscription.add(
            timer(this.options.heartbeatInterval, this.options.heartbeatInterval)
                .pipe(
                    withLatestFrom(this.leader$),
                    // only when follower
                    filter(([_, leader]) => leader.status === LeadershipStatus.FOLLOWER),
                    switchMap(() => {
                        this.options.logger?.info(loggerName, 'heartbeating');
                        const time = Date.now() as Timestamp;
                        const request$ = this.channel.requestResponse({
                            topic: LeadershipTopicTypes.Heartbeat,
                            payload: time,
                        }) as Observable<HeartbeatResponse>;
                        const timeout$ = timer(this.options.heartbeatTimeout).pipe(
                            map(() => 'timeout'),
                        );
                        return combineLatest([of(time), race(request$, timeout$)]);
                    }),
                    tap(([sent, received]) => {
                        if (received === 'timeout') {
                            // new election
                            this.options.logger?.info(loggerName, 'leader is dead.');
                            this.election.start();
                            return;
                        }
                        const totalTime = Date.now() - sent;
                        this.options.logger?.info(loggerName, 'heartbeat', 'total =', totalTime);
                    }),
                )
                .subscribe(),
        );
    }

    private askForLeader() {
        this.options.logger?.info(loggerName, 'asking for leader...');

        return firstValueFrom(
            this.channel
                .requestResponse({
                    topic: LeadershipTopicTypes.WhoIsLeader,
                    payload: undefined,
                })
                .pipe(
                    filter(
                        (m): m is WhoIsLeaderResponse =>
                            m.topic === LeadershipTopicTypes.WhoIsLeaderResponse,
                    ),
                ),
        );
    }

    public async dispose() {
        // TODO:
        // if(iamLeader) {
        // broadcast to other nodes that I am leaving
        // }
        // unsubscribe from all streams
        this.subscription.unsubscribe();
        // unsubscribe from channel
        this.channel.dispose();
    }
}

const TIMEOUT = 'timeout' as const;

const timeout = (ms: number) => {
    return new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(TIMEOUT);
        }, ms);
    });
};
