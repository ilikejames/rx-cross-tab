# @tabrx/leader

Implementation of raft like leadership election across tabs. 

TODO:

- [x] add e2e tests just around leadership
- [x] broadcast on close
- [ ] heartbeat 

what happens if leader freezes... i guess the heartbeat. ✅
maybe we just broadcast who is leader as part of heartbeat. 
when vote is aligned. and the leader awakes, the leader just accepts the other. 

pull all messaging into own files. with types explicitly set. 

subscribe to uuid as topic on each. 
e.g. 23232-e2e3e-232d2-22323/heartbeat 

any ts magic I could use to create ties between requests/response pairs?
take a look at the hydra-platform messaging interface
