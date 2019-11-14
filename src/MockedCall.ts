import {DiffMatcher} from "mismatched/dist/src/matcher/DiffMatcher";
import {match} from "mismatched";
import {matchMaker} from "mismatched/dist/src/matcher/matchMaker";
import {Thespian} from "./Thespian";
import {SuccessfulCall, UnsuccessfulCall} from "./SuccessfulCall";

// Attached to a Handler - one for each possible call:
export class MockedCall<U> {// where U is the return type
    private expectedTimesInProgress = match.isEquals(1) as DiffMatcher<any>;
    private expectedTimes = match.isEquals(1) as DiffMatcher<any>;
    private actualTimes = 0;
    private returnFn: (...args: Array<any>) => U;

    // todo Need to also record the specifics of each matched call to a MockedCall, where times > 1

    constructor(public fullName: string,
                public methodName: string,
                expectedArguments: Array<any>,
                private successfulCalls: Array<SuccessfulCall>,
                private expectedArgs = match.array.match(expectedArguments)) {
    }

    returns(fn: (...args: Array<any>) => U): this {
        this.returnFn = fn;
        return this;
    }

    returnsVoid(): this {
        this.returnFn = (...args: Array<any>) => undefined as any as U;
        return this;
    }

    times(count: number): this {
        this.expectedTimes = matchMaker(count);
        this.expectedTimesInProgress = match.number.lessEqual(count);
        return this;
    }

    timesAtLeast(count: number): this {
        this.expectedTimes = match.number.greaterEqual(count);
        this.expectedTimesInProgress = match.number.greaterEqual(count);
        return this;
    }

    timesAtMost(count: number): this {
        this.expectedTimes = match.number.lessEqual(count);
        this.expectedTimesInProgress = match.number.lessEqual(count);
        return this;
    }

    matchToRunResult(actualArgs: Array<any>): RunResult {
        if (!this.returnFn) {
            throw new Error(`A returns() function is needed for mock for "${this.fullName}()"`);
        }
        // todo Add extra undefined to actualArgs if not long enough
        const matchResult = this.expectedArgs.matches(actualArgs);
        const timesIncorrect = !this.expectedTimesInProgress.matches(this.actualTimes + 1).passed();
        const times = (timesIncorrect) ? this.actualTimes + 1 : this.actualTimes;
        if (!matchResult.passed()) {
            return this.makeNearMiss(matchResult, times);
        }
        if (timesIncorrect) {
            // return this.makeNearMiss( // todo Include problem in diff??
            //     new MatchResult(matchResult.diff, matchResult.compares + 1, matchResult.matches));
            return this.makeNearMiss(matchResult, times);
        }
        try {
            const result = this.returnFn.apply(undefined, actualArgs);
            this.actualTimes += 1;
            this.successfulCalls.push(SuccessfulCall.make(this.fullName,
                actualArgs, result, this.expectedTimes.describe()));
            return {result};
        } catch (e) {
            Thespian.printer.logToConsole({exception: "In MockedCall.didRun()", e}); // todo Improve message
            throw e;
        }
    }

    makeNearMiss(matchResult, actualTimes: number) {
        return {
            failed: UnsuccessfulCall.makeNearMiss(this.fullName,
                matchResult, this.expectedTimes.describe(), actualTimes)
        };
    }

    hasRun(): boolean {
        return this.actualTimes > 0;
    }

    hasPassed(): boolean {
        return this.expectedTimes.matches(this.actualTimes).passed();
    }

    describe(): UnsuccessfulCall {
        return UnsuccessfulCall.make(this.fullName,
            this.expectedArgs.describe(), this.expectedTimes.describe(), this.actualTimes);
    }
}

export interface RunResult {
    result?: any;
    failed?: UnsuccessfulCall;
}