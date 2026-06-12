type TestFn = () => void | Promise<void>;

interface Test {
    name: string;
    fn: TestFn;
}

interface Suite {
    name: string;
    tests: Test[];
    beforeEachFns: (() => void | Promise<void>)[];
}

const suites: Suite[] = [];
let currentSuite: Suite | null = null;

export function describe(name: string, fn: () => void) {
    const suite: Suite = {
        name,
        tests: [],
        beforeEachFns: []
    };
    suites.push(suite);
    const prevSuite = currentSuite;
    currentSuite = suite;
    fn();
    currentSuite = prevSuite;
}

export function it(name: string, fn: TestFn) {
    if (!currentSuite) {
        throw new Error("it() must be called inside describe()");
    }
    currentSuite.tests.push({ name, fn });
}

export function beforeEach(fn: () => void | Promise<void>) {
    if (!currentSuite) {
        throw new Error("beforeEach() must be called inside describe()");
    }
    currentSuite.beforeEachFns.push(fn);
}

class Assertion {
    constructor(private value: unknown, private isNot: boolean = false) {}

    get not() {
        return new Assertion(this.value, !this.isNot);
    }

    toBe(expected: unknown) {
        const pass = this.value === expected;
        if (this.isNot ? pass : !pass) {
            throw new Error(`Expected ${JSON.stringify(this.value)} ${this.isNot ? "not " : ""}to be ${JSON.stringify(expected)}`);
        }
    }

    toEqual(expected: unknown) {
        const valStr = JSON.stringify(this.value);
        const expStr = JSON.stringify(expected);
        const pass = valStr === expStr;
        if (this.isNot ? pass : !pass) {
            throw new Error(`Expected ${valStr} ${this.isNot ? "not " : ""}to equal ${expStr}`);
        }
    }

    toBeDefined() {
        const pass = this.value !== undefined;
        if (this.isNot ? pass : !pass) {
            throw new Error(`Expected value ${this.isNot ? "not " : ""}to be defined`);
        }
    }

    toBeNull() {
        const pass = this.value === null;
        if (this.isNot ? pass : !pass) {
            throw new Error(`Expected ${JSON.stringify(this.value)} ${this.isNot ? "not " : ""}to be null`);
        }
    }

    toBeTruthy() {
        const pass = !!this.value;
        if (this.isNot ? pass : !pass) {
            throw new Error(`Expected ${JSON.stringify(this.value)} ${this.isNot ? "not " : ""}to be truthy`);
        }
    }

    toBeFalsy() {
        const pass = !this.value;
        if (this.isNot ? pass : !pass) {
            throw new Error(`Expected ${JSON.stringify(this.value)} ${this.isNot ? "not " : ""}to be falsy`);
        }
    }

    toThrow(expectedMessage?: string) {
        let threw = false;
        let errorMsg = "";
        try {
            (this.value as () => void)();
        } catch (e: unknown) {
            threw = true;
            errorMsg = e instanceof Error ? e.message : String(e);
        }
        
        const pass = threw && (!expectedMessage || errorMsg.includes(expectedMessage));
        if (this.isNot ? pass : !pass) {
            throw new Error(`Expected function ${this.isNot ? "not " : ""}to throw${expectedMessage ? ` error containing "${expectedMessage}"` : ""}`);
        }
    }

    async toThrowAsync(expectedMessage?: string) {
        let threw = false;
        let errorMsg = "";
        try {
            await (this.value as () => Promise<void>)();
        } catch (e: unknown) {
            threw = true;
            errorMsg = e instanceof Error ? e.message : String(e);
        }
        
        const pass = threw && (!expectedMessage || errorMsg.includes(expectedMessage));
        if (this.isNot ? pass : !pass) {
            throw new Error(`Expected async function ${this.isNot ? "not " : ""}to throw${expectedMessage ? ` error containing "${expectedMessage}"` : ""}`);
        }
    }

    toContain(item: unknown) {
        let pass = false;
        if (Array.isArray(this.value)) {
            pass = this.value.includes(item);
        } else if (typeof this.value === 'string') {
            pass = this.value.includes(String(item));
        } else {
            throw new Error(`Cannot use toContain on ${typeof this.value}`);
        }

        if (this.isNot ? pass : !pass) {
            throw new Error(`Expected ${JSON.stringify(this.value)} ${this.isNot ? "not " : ""}to contain ${JSON.stringify(item)}`);
        }
    }

    toBeGreaterThan(num: number) {
        const pass = typeof this.value === 'number' && this.value > num;
        if (this.isNot ? pass : !pass) {
            throw new Error(`Expected ${this.value} ${this.isNot ? "not " : ""}to be greater than ${num}`);
        }
    }

    toBeLessThan(num: number) {
        const pass = typeof this.value === 'number' && this.value < num;
        if (this.isNot ? pass : !pass) {
            throw new Error(`Expected ${this.value} ${this.isNot ? "not " : ""}to be less than ${num}`);
        }
    }
}

export function expect(value: unknown) {
    return new Assertion(value);
}

export async function runAllSuites() {
    let passed = 0;
    let failed = 0;
    console.log(`\n=== Running Test Runner ===\n`);
    for (const suite of suites) {
        console.log(`Suite: ${suite.name}`);
        for (const test of suite.tests) {
            try {
                // Run beforeEach fns
                for (const fn of suite.beforeEachFns) {
                    await fn();
                }
                // Run test
                await test.fn();
                console.log(`  ✓ ${test.name}`);
                passed++;
            } catch (err: unknown) {
                console.error(`  ✗ ${test.name}`);
                const errorMsg = err instanceof Error ? err.message : String(err);
                const errorStack = err instanceof Error ? err.stack : undefined;
                console.error(`    Error: ${errorMsg}`);
                if (errorStack) {
                    console.error(errorStack.split('\n').slice(0, 3).join('\n'));
                }
                failed++;
            }
        }
    }
    console.log(`\n=== Summary ===`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${passed + failed}\n`);
    return { passed, failed, total: passed + failed };
}
