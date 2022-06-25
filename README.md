
TODO: 
- Bug: new joiners don't get initial startup state (but do get next state)
- Add linting
- Types of sharing, plus some really good names. 
- Does the unsubscribe work correctly.

```ts
/*
   If anything can set, then this will require a rethinking of the leadership...
   actually, looks to be more in the onSubscriptionRequest
*/
```

a) be able to read and set
```ts
const subject = new BehaviorSubject<number>(0);
const [useNumber] = bind(() => {
    const [stream$, setter] = duplex('SharedNumber', subject.pipe(shareLatest()));
    setter(v => subject.next(v))
    return stream$
}, 0);
```

b) parameters
```ts
const [useItem] = bind((id: number) => {
    const [stream$] = duplex(`GetItem:${id}`, subject.pipe(shareLatest()));
    return stream$
}, 0);
```

c) websocket reading
```ts
const [useStockQuotes] = bind((ticker: string) => {
    const [stream$] = duplex(`StockQuotes:${ticker}`, subject.pipe(shareLatest()));
    return stream$
}, 0);
```

d) websocket posting
```ts
const saveItem = async (item: Item) => {
    const [stream$] = duplex(`SaveItem`, service.saveItem(item))
    return stream$.pipe(first()).toPromise()
};
```

## Will need a section on Don't

e.g. Don't when need individual streams that need to be unique