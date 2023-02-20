

## leader: 

-   should emit more often
-   everything should have a name/id published
-   leader should not be bool. 
    'electing' | 'leader' |   'follower'

---

-   leadership could be short cut with just a localStorage item with is 
    cleared when the leader closes. Exists? ask... doesn't exist... auto leader. 
    Is there a race condition though? So a new joiner should still wait for a response from the leader regardless?


---

-   is this cross domain? no. same `origin` only.
-   bigint serialization
-   new joiners are very broken when there is an initial value. 

