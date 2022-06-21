import { createLeaderElection, BroadcastChannel } from "broadcast-channel";
import { BehaviorSubject, shareReplay } from "rxjs";
import { settings } from "./settings";

const leader = new BehaviorSubject<boolean>(false);

export const leader$ = leader.pipe(shareReplay(1));
// TODO: this should only happen once.

const channel = new BroadcastChannel(settings.leadershipChannel);
const election = createLeaderElection(channel);

const followerPromise = new Promise<void>((resolve) => {
  setTimeout(() => {
    if (election.isLeader) {
      console.log("Leader");
    } else {
      console.log("is follower");
    }
    resolve();
  }, settings.leadershipTimeout);
});

const electSelf = election.awaitLeadership().then(() => {
  leader.next(election.isLeader);
});

Promise.race([electSelf, followerPromise]);
