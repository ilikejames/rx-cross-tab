import { BrowserContext, Locator, Page, expect, test } from '@playwright/test'
import { init } from './config'
import { log, waitUntil } from './helper'

test.describe.skip('button with global click count', () => {
    let env: Awaited<ReturnType<typeof init>>
    const selector = 'button:has-text("Click Increments Across All Tabs:")'

    test.beforeEach(async ({ page }) => {
        env = await init()
        await createTabInstanceName(page, 'one')
        await page.goto(env.url)
    })

    test.afterEach(() => env.dispose())

    test('a single instance', async ({ page }) => {
        const button = await page.locator(selector)
        const before = await getCount(button)
        for (let i = 0; i < 5; i++) {
            log.when('Clicking')
            await button.click()
            log.data('Count =', await getCount(button))
            expect(await getCount(button)).toBe(before! + i + 1)
        }
    })

    test('second instance starts with the correct initial state', async ({ context, page: first }) => {
        const buttonA = await first.locator(selector)
        log.when('Clicking "A"')
        await buttonA.click()
        await buttonA.click()

        log.data({ A: await getCount(buttonA) })
        expect(await getCount(buttonA)).toBe(2)

        log.then('Opening 2nd page')
        const second = await getNewInstance(context, 'second')
        try {
            log.then('Opening second page url')
            await second.goto(env.url)
            log.then('Getting button')
            const buttonB = await second.locator(selector)

            await waitUntil(async () => {
                const count = await getCount(buttonB)
                log.data('count =', count)
                return count === 2
            })
            log.data({ A: await getCount(buttonA), B: await getCount(buttonB) })
            expect(await getCount(buttonA)).toBe(2)
            expect(await getCount(buttonB)).toBe(2)
        } finally {
            await second.close()
        }
    })

    test('a second instance joins and clicks are broadcast across both', async ({ page: first, context }) => {
        const second = await getNewInstance(context, 'second')
        try {
            await second.goto(env.url)
            const buttonA = await first.locator(selector)
            const buttonB = await second.locator(selector)

            const max = 5
            for (let i = 0; i < max; i++) {
                log.when('Clicking "A"')
                await buttonA.click()

                await waitUntil(async () => (await getCount(buttonA)) === i + 1)
                await waitUntil(async () => (await getCount(buttonB)) === i + 1)

                log.data({ A: await getCount(buttonA), B: await getCount(buttonB) })
            }

            for (let i = 0; i < 10; i++) {
                log.when('Clicking "B"')
                await buttonB.click()
                await waitUntil(async () => (await getCount(buttonA)) === i + max + 1)
                await waitUntil(async () => (await getCount(buttonB)) === i + max + 1)
                log.data({ A: await getCount(buttonA), B: await getCount(buttonB) })
            }
        } finally {
            await second.close()
        }
    })

    test('with 2 instances, the first instance closes, and a new joins', async ({ page: first, context }) => {
        const second = await getNewInstance(context, 'second')

        let third: Page | undefined = undefined

        try {
            await second.goto(env.url)
            const buttonA = await first.locator(selector)
            const buttonB = await second.locator(selector)

            log.when('first instance clicks button')
            await buttonA.click()
            log.when('second instance clicks button')
            await buttonB.click()

            await waitUntil(async () => (await getCount(buttonA)) === 2)
            await waitUntil(async () => (await getCount(buttonB)) === 2)
            log.data({ A: await getCount(buttonA), B: await getCount(buttonB) })

            log.then('first instance closes')
            await first.close()

            // TODO: we have to wait for leader... BUG: fixme.
            await second.waitForTimeout(5_000)

            log.when('second instance clicks button')
            await buttonB.click()
            expect(await getCount(buttonB)).toBe(3)

            log.when('third tab joins')
            third = await getNewInstance(context, 'third')
            await third.addInitScript(() => localStorage.setItem('tabId', 'third'))
            await third.goto(env.url)
            const buttonC = await third.locator(selector)

            log.when('third has the correct initial state:')
            await waitUntil(async () => (await getCount(buttonB)) === 3)
            await waitUntil(async () => (await getCount(buttonC)) === 3)
            log.data({ B: await getCount(buttonB), C: await getCount(buttonC) })

            log.when('second instance clicks button')
            await buttonC.click()

            await waitUntil(async () => (await getCount(buttonB)) === 4)
            await waitUntil(async () => (await getCount(buttonC)) === 4)
            log.data({ B: await getCount(buttonB), C: await getCount(buttonC) })
        } finally {
            await second.close()
            third && (await third.close())
        }
    })
})

const getCount = async (locator: Locator) => {
    const value = await locator.textContent()
    return value ? parseInt(/[\d]+/g.exec(value)![0]) : undefined
}

const getNewInstance = async (context: BrowserContext, name: string) => {
    const newInstance = await context.newPage()
    await createTabInstanceName(newInstance, name)
    return newInstance
}

const createTabInstanceName = async (instance: Page, name: string) => {
    await instance.addInitScript((name: string) => localStorage.setItem('tabId', name), [name])
}
