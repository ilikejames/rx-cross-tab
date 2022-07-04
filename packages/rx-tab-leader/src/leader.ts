import { BehaviorSubject, shareReplay } from 'rxjs';

export const leader = new BehaviorSubject<boolean>(false);
export const term = new BehaviorSubject<number>(0);

export const leader$ = leader.pipe(shareReplay(1));
