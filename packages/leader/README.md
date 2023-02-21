# @tabrx/leader

Implementation of raft like leadership election across tabs. 


- [x] tests around leadership
- [x] broadcast on close
- [x] heartbeat and election on timeout

what happens if leader freezes... i guess the heartbeat. ✅
maybe we just broadcast who is leader as part of heartbeat. 
when vote is aligned. and the leader awakes, the leader just accepts the other. 

pull all messaging into own files. with types explicitly set. 

any ts magic I could use to create ties between requests/response pairs?
take a look at the hydra-platform messaging interface
