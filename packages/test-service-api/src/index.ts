import { Observable } from 'rxjs'

interface Price {
    ticker: string
    price: string
}

export type PriceService = {
    price: (ticker: string) => Observable<Price>
}

export const PRICE_ROUTE = 'price/'
