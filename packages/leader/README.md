# @tabrx/leader

Implementation of raft like leadership election across tabs. 

TODO:

- add e2e tests just around leadership
- broadcast on close
- heartbeat 

what happens if leader freezes... 
i guess the heartbeat. 
maybe we just broadcast who is leader as part of heartbeat. 
when vote is aligned. and the leader awakes, the leader just accepts the other. 

pull all messaging into own files. with types explicitly set. 

subscribe to uuid as topic on each. 
e.g. 23232-e2e3e-232d2-22323/heartbeat 

any config I could use to create ties?

take a look at the hydra-platform messaging interface
